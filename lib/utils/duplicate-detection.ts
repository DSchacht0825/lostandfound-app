import { createClient } from '@/lib/supabase/client'
import Fuse from 'fuse.js'

export interface SimilarPerson {
  id: string
  client_id: string
  first_name: string
  last_name: string
  nickname: string | null
  date_of_birth: string
  similarity_score: number
  last_encounter_date: string | null
}

export interface DuplicateCheckResult {
  hasPotentialDuplicates: boolean
  similarPersons: SimilarPerson[]
}

/**
 * Check for potential duplicate persons using fuzzy matching
 * @param firstName - First name to search for
 * @param lastName - Last name to search for
 * @param dateOfBirth - Optional date of birth for exact match
 * @param threshold - Similarity threshold (0-1, default 0.3)
 * @returns Promise with duplicate check results
 */
export async function checkForDuplicates(
  firstName: string,
  lastName: string,
  dateOfBirth?: string,
  threshold: number = 0.3
): Promise<DuplicateCheckResult> {
  const supabase = createClient()

  try {
    // Call the database function for fuzzy search
    const { data, error } = await supabase.rpc(
      'search_similar_persons',
      {
        search_first_name: firstName,
        search_last_name: lastName,
        search_dob: dateOfBirth || null,
        similarity_threshold: threshold,
      } as never
    )

    if (error) {
      console.error('Error checking for duplicates:', error)
      return {
        hasPotentialDuplicates: false,
        similarPersons: [],
      }
    }

    const similarPersons = (data || []) as SimilarPerson[]

    return {
      hasPotentialDuplicates: similarPersons.length > 0,
      similarPersons,
    }
  } catch (error) {
    console.error('Exception checking for duplicates:', error)
    return {
      hasPotentialDuplicates: false,
      similarPersons: [],
    }
  }
}

/**
 * Client-side fuzzy search for real-time search as user types
 * @param searchTerm - The search term
 * @param persons - Array of persons to search through
 * @returns Filtered and sorted array of persons
 */
export function fuzzySearchPersons<T extends {
  id: string
  client_id: string
  first_name: string
  last_name: string
  nickname: string | null
  date_of_birth: string
}>(
  searchTerm: string,
  persons: T[]
): T[] {
  if (!searchTerm || searchTerm.trim() === '') {
    return persons
  }

  const fuse = new Fuse(persons, {
    keys: [
      { name: 'first_name', weight: 0.4 },
      { name: 'last_name', weight: 0.4 },
      { name: 'nickname', weight: 0.3 },
      { name: 'client_id', weight: 0.3 },
    ],
    threshold: 0.4,
    includeScore: true,
    minMatchCharLength: 2,
  })

  const results = fuse.search(searchTerm)
  return results.map((result) => result.item)
}

/**
 * Calculate similarity score between two strings
 * Simple implementation of Levenshtein distance
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  const costs: number[] = []
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue
    }
  }

  const maxLength = Math.max(s1.length, s2.length)
  return maxLength === 0 ? 1 : 1 - costs[s2.length] / maxLength
}
