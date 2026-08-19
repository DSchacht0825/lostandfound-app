import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const HOUSING_PLACEMENTS = new Set([
  'East County Transitional Living',
  'Restoration Ranch',
  'Mission Academy',
  'La Posada',
])

const PERMANENT_HOUSING_DEST = 'Permanent housing for formerly homeless persons (CoC, ESG, or other funding)'

const permanentHousingDests = [
  'Owned by client, no ongoing subsidy',
  'Owned by client, with ongoing subsidy (mortgage, VA, etc.)',
  'Rental by client, no ongoing subsidy',
  'Rental by client, with VASH subsidy',
  'Rental by client, with other ongoing housing subsidy (HCV, public housing, CoC-RRH, etc.)',
  'Permanent housing for formerly homeless persons (CoC, ESG, or other funding)',
  'Staying or living with family, permanent tenure',
  'Staying or living with friends, permanent tenure',
  'Permanent housing',
]

const getLocalDateString = (dateStr: string): string => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function main() {
  const { data: allExited, error: pErr } = await supabase
    .from('persons')
    .select('id, first_name, last_name, exit_date, exit_destination')
    .not('exit_date', 'is', null)
  if (pErr) { console.error(pErr); process.exit(1) }

  const alreadyHoused = allExited!.filter(p => p.exit_destination && permanentHousingDests.includes(p.exit_destination))

  // Bucket 1: exact-string typo/phrasing fixes -> clearly permanent housing
  const typoFixIds = new Set<string>()
  const typoFixes = allExited!.filter(p => {
    const d = (p.exit_destination || '').trim().toLowerCase()
    return d === 'permanently housed in vista' || d === 'permeant housing'
  })
  typoFixes.forEach(p => typoFixIds.add(p.id))

  // Bucket 2: exit_destination literally "Ectlc" (East County Transitional Living Center abbreviation)
  const ectlcFixes = allExited!.filter(p => (p.exit_destination || '').trim().toLowerCase() === 'ectlc')
  ectlcFixes.forEach(p => typoFixIds.add(p.id))

  // Bucket 3: generic "Emergency shelter" exits whose *actual* triggering placement was
  // ECTL / Restoration Ranch / Mission Academy / La Posada (dashboard collapses all
  // non-detox/non-other placements into "Emergency shelter" at exit time).
  const genericShelter = allExited!.filter(p => p.exit_destination === 'Emergency shelter (including hotel/motel paid for with voucher)')
  const personIds = genericShelter.map(p => p.id)
  const { data: encounters, error: eErr } = await supabase
    .from('encounters')
    .select('person_id, service_date, placement_location')
    .eq('placement_made', true)
    .in('person_id', personIds)
  if (eErr) { console.error(eErr); process.exit(1) }

  const placementFixes: { person: any; placement_location: string }[] = []
  for (const p of genericShelter) {
    const exitMs = new Date(`${p.exit_date}T12:00:00Z`).getTime()
    const candidates = encounters!.filter(e => {
      if (e.person_id !== p.id) return false
      const svcMs = new Date(`${getLocalDateString(e.service_date)}T12:00:00Z`).getTime()
      return Math.abs(svcMs - exitMs) <= 86400000
    })
    if (candidates.length === 0) continue
    const loc = candidates[candidates.length - 1].placement_location
    if (HOUSING_PLACEMENTS.has(loc)) {
      placementFixes.push({ person: p, placement_location: loc })
    }
  }

  const allFixIds = new Set<string>([...typoFixIds, ...placementFixes.map(m => m.person.id)])

  console.log(`Already correctly counted as Housed: ${alreadyHoused.length}`)
  console.log(`Typo/phrasing fixes (Permanently Housed in Vista, permeant housing): ${typoFixes.length}`)
  console.log(`"Ectlc" -> East County Transitional Living fixes: ${ectlcFixes.length}`)
  console.log(`Generic "Emergency shelter" reclassified via matched placement: ${placementFixes.length}`)
  placementFixes.forEach(m => console.log(`   ${m.person.first_name} ${m.person.last_name} -> ${m.placement_location}`))
  console.log(`\nTOTAL projected "Housed" count: ${alreadyHoused.length + allFixIds.size}`)
  console.log(`Target: 31`)

  if (!process.argv.includes('--apply')) {
    console.log('\nDRY RUN only. Re-run with --apply to write changes.')
    return
  }

  console.log('\nApplying...')
  const toApply = [
    ...typoFixes.map(p => ({ person: p, placement_location: p.exit_destination })),
    ...ectlcFixes.map(p => ({ person: p, placement_location: p.exit_destination })),
    ...placementFixes,
  ]
  for (const m of toApply) {
    const { error } = await supabase
      .from('persons')
      .update({ exit_destination: PERMANENT_HOUSING_DEST })
      .eq('id', m.person.id)
    if (error) {
      console.error(`  FAILED ${m.person.first_name} ${m.person.last_name}:`, error)
      continue
    }
    await supabase.from('status_changes').insert({
      person_id: m.person.id,
      change_type: 'exit',
      change_date: m.person.exit_date,
      exit_destination: PERMANENT_HOUSING_DEST,
      notes: `Recategorized from "${m.placement_location}" to Permanent Housing (data cleanup)`,
      created_by: 'Recategorization Script',
    })
    console.log(`  OK ${m.person.first_name} ${m.person.last_name}`)
  }
}

main()
