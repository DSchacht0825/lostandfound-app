/**
 * Backfill script: Create program exits for "Other" placements that didn't auto-exit
 *
 * Run with: npx tsx --env-file=.env.local scripts/backfill-other-placements.ts
 *
 * This script:
 * 1. Finds all encounters with placement_location = 'Other'
 * 2. Checks if those persons already have an exit_date
 * 3. Creates exits for those that don't
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function backfillOtherPlacements() {
  console.log('🔍 Finding "Other" placements without program exits...\n')

  // Find all encounters with placement_location = 'Other'
  const { data: otherPlacements, error: placementError } = await supabase
    .from('encounters')
    .select(`
      id,
      person_id,
      service_date,
      placement_location_other,
      persons!inner (
        id,
        first_name,
        last_name,
        exit_date
      )
    `)
    .eq('placement_made', true)
    .eq('placement_location', 'Other')

  if (placementError) {
    console.error('Error fetching placements:', placementError)
    process.exit(1)
  }

  if (!otherPlacements || otherPlacements.length === 0) {
    console.log('✅ No "Other" placements found.')
    return
  }

  console.log(`Found ${otherPlacements.length} "Other" placement(s)\n`)

  // Filter to those without exits
  const needsExit = otherPlacements.filter((p: any) => !p.persons.exit_date)

  console.log(`${needsExit.length} placement(s) need exit records:\n`)

  if (needsExit.length === 0) {
    console.log('✅ All "Other" placements already have exits!')
    return
  }

  // Show what we'll do
  for (const placement of needsExit) {
    const person = (placement as any).persons
    const exitDest = placement.placement_location_other || 'Emergency shelter (including hotel/motel paid for with voucher)'
    console.log(`  - ${person.first_name} ${person.last_name}`)
    console.log(`    Placement date: ${placement.service_date}`)
    console.log(`    Exit destination: ${exitDest}\n`)
  }

  // Prompt for confirmation
  console.log('---')
  console.log('⚠️  DRY RUN - No changes made yet.')
  console.log('To apply these changes, run with --apply flag:')
  console.log('npx tsx scripts/backfill-other-placements.ts --apply\n')

  if (!process.argv.includes('--apply')) {
    return
  }

  // Apply the changes
  console.log('🚀 Applying changes...\n')

  let successCount = 0
  let errorCount = 0

  for (const placement of needsExit) {
    const person = (placement as any).persons
    const exitDestination = placement.placement_location_other || 'Emergency shelter (including hotel/motel paid for with voucher)'

    // Update person with exit date and destination
    const { error: exitError } = await supabase
      .from('persons')
      .update({
        exit_date: placement.service_date,
        exit_destination: exitDestination,
      })
      .eq('id', placement.person_id)

    if (exitError) {
      console.error(`  ❌ Error updating ${person.first_name} ${person.last_name}:`, exitError)
      errorCount++
      continue
    }

    // Log to status_changes
    const { error: statusError } = await supabase
      .from('status_changes')
      .insert({
        person_id: placement.person_id,
        change_type: 'exit',
        change_date: placement.service_date,
        exit_destination: exitDestination,
        notes: `Backfill: Auto-exited for "Other" placement to ${exitDestination}`,
        created_by: 'Backfill Script',
      })

    if (statusError) {
      console.error(`  ⚠️  Person updated but status_changes failed for ${person.first_name}:`, statusError)
    }

    console.log(`  ✅ ${person.first_name} ${person.last_name} - exited to "${exitDestination}"`)
    successCount++
  }

  console.log('\n---')
  console.log(`✅ Complete: ${successCount} exits created, ${errorCount} errors`)
}

backfillOtherPlacements().catch(console.error)
