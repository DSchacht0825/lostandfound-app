import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function findMissing() {
  // Get all placements that SHOULD have triggered exits
  const { data: placements } = await supabase
    .from('encounters')
    .select('person_id, placement_location, placement_location_other, service_date, persons!inner(first_name, last_name, exit_date)')
    .eq('placement_made', true)
    .neq('placement_location', 'Shelter Not Available')

  // Find those without exits
  const missing = placements?.filter((p: any) => !p.persons.exit_date)

  console.log('=== Placements WITHOUT program exits ===\n')
  missing?.forEach((p: any) => {
    console.log(`- ${p.persons.first_name} ${p.persons.last_name}`)
    console.log(`  Placement: ${p.placement_location}${p.placement_location_other ? ' (' + p.placement_location_other + ')' : ''}`)
    console.log(`  Date: ${p.service_date}\n`)
  })
  console.log(`Total missing: ${missing?.length || 0}`)
}

findMissing()
