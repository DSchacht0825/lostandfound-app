/**
 * Backfill script: Create program exits for placements that didn't auto-exit
 *
 * Run with: npx tsx --env-file=.env.local scripts/backfill-missing-exits.ts
 * Apply with: npx tsx --env-file=.env.local scripts/backfill-missing-exits.ts --apply
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Map placement locations to HUD exit destinations
function getExitDestination(placementLocation: string, placementOther?: string): string {
  if (placementLocation === 'Detox') {
    return 'Substance abuse treatment facility or detox center'
  }
  if (placementLocation === 'Other' && placementOther) {
    return placementOther
  }
  return 'Emergency shelter (including hotel/motel paid for with voucher)'
}

async function backfillMissingExits() {
  console.log('🔍 Finding placements without program exits...\n')

  // Get all placements that SHOULD have triggered exits (excluding "Shelter Not Available")
  const { data: placements, error } = await supabase
    .from('encounters')
    .select(`
      id,
      person_id,
      placement_location,
      placement_location_other,
      service_date,
      persons!inner(id, first_name, last_name, exit_date)
    `)
    .eq('placement_made', true)
    .neq('placement_location', 'Shelter Not Available')

  if (error) {
    console.error('Error fetching placements:', error)
    process.exit(1)
  }

  // Find those without exits
  const missing = placements?.filter((p: any) => !p.persons.exit_date) || []

  if (missing.length === 0) {
    console.log('✅ All placements already have exits!')
    return
  }

  console.log(`Found ${missing.length} placement(s) needing exits:\n`)

  for (const p of missing as any[]) {
    const exitDest = getExitDestination(p.placement_location, p.placement_location_other)
    console.log(`  - ${p.persons.first_name} ${p.persons.last_name}`)
    console.log(`    Placement: ${p.placement_location}${p.placement_location_other ? ' (' + p.placement_location_other + ')' : ''}`)
    console.log(`    Date: ${p.service_date}`)
    console.log(`    Exit destination: ${exitDest}\n`)
  }

  console.log('---')

  if (!process.argv.includes('--apply')) {
    console.log('⚠️  DRY RUN - No changes made.')
    console.log('To apply: npx tsx --env-file=.env.local scripts/backfill-missing-exits.ts --apply\n')
    return
  }

  console.log('🚀 Applying changes...\n')

  let successCount = 0
  let errorCount = 0

  for (const p of missing as any[]) {
    const exitDestination = getExitDestination(p.placement_location, p.placement_location_other)

    // Update person with exit date and destination
    const { error: exitError } = await supabase
      .from('persons')
      .update({
        exit_date: p.service_date,
        exit_destination: exitDestination,
      })
      .eq('id', p.person_id)

    if (exitError) {
      console.error(`  ❌ Error updating ${p.persons.first_name} ${p.persons.last_name}:`, exitError)
      errorCount++
      continue
    }

    // Log to status_changes
    await supabase
      .from('status_changes')
      .insert({
        person_id: p.person_id,
        change_type: 'exit',
        change_date: p.service_date,
        exit_destination: exitDestination,
        notes: `Backfill: Placement to ${p.placement_location}${p.placement_location_other ? ' (' + p.placement_location_other + ')' : ''}`,
        created_by: 'Backfill Script',
      })

    console.log(`  ✅ ${p.persons.first_name} ${p.persons.last_name} → "${exitDestination}"`)
    successCount++
  }

  console.log(`\n✅ Complete: ${successCount} exits created, ${errorCount} errors`)
}

backfillMissingExits()
