import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function findMissionAcademy() {
  const { data: placements, error } = await supabase
    .from('encounters')
    .select('person_id, placement_location, service_date, persons!inner(first_name, last_name)')
    .eq('placement_made', true)
    .eq('placement_location', 'Mission Academy')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('=== People placed at Mission Academy ===\n')

  if (!placements || placements.length === 0) {
    console.log('No placements to Mission Academy found.')
    return
  }

  placements.forEach((p: any) => {
    console.log(`- ${p.persons.first_name} ${p.persons.last_name}`)
    console.log(`  Date: ${p.service_date}\n`)
  })

  console.log(`Total: ${placements.length}`)
}

findMissionAcademy()
