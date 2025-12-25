/**
 * Generate a project name from user's prompt message
 * Extracts key information and creates a concise, descriptive name
 */
export function generateProjectName(prompt: string): string {
  if (!prompt || !prompt.trim()) {
    return "New Project"
  }

  // Clean the prompt
  let cleaned = prompt.trim()
  
  // Remove common prefixes
  cleaned = cleaned.replace(/^(create|build|make|design|develop|build me|create a|make a|design a|develop a)\s+/i, "")
  
  // Remove theme instructions
  cleaned = cleaned.replace(/\n\nTheme:.*$/i, "")
  cleaned = cleaned.replace(/\nTheme:.*$/i, "")
  
  // Extract the first sentence or meaningful phrase
  const sentences = cleaned.split(/[.!?]\s+/)
  let firstSentence = sentences[0] || cleaned
  
  // Limit to first 60 characters for the base
  if (firstSentence.length > 60) {
    firstSentence = firstSentence.substring(0, 60)
    // Try to cut at a word boundary
    const lastSpace = firstSentence.lastIndexOf(" ")
    if (lastSpace > 30) {
      firstSentence = firstSentence.substring(0, lastSpace)
    }
  }
  
  // Extract key words - look for common patterns
  const patterns = [
    /(?:a|an|the)\s+([a-z]+(?:\s+[a-z]+){0,2})\s+(?:app|application|website|site|platform|dashboard|tool|system)/i,
    /(?:build|create|make)\s+(?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+){0,2})/i,
    /^([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,3})/,
  ]
  
  for (const pattern of patterns) {
    const match = firstSentence.match(pattern)
    if (match && match[1]) {
      const extracted = match[1].trim()
      if (extracted.length > 3 && extracted.length < 50) {
        return capitalizeWords(extracted)
      }
    }
  }
  
  // Fallback: use first few words, capitalized
  const words = firstSentence.split(/\s+/).slice(0, 4)
  const name = words.join(" ")
  
  // Clean up and capitalize
  return capitalizeWords(name)
}

function capitalizeWords(str: string): string {
  return str
    .split(/\s+/)
    .map(word => {
      // Skip common words that shouldn't be capitalized (unless first word)
      const lowerWords = ["a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"]
      if (lowerWords.includes(word.toLowerCase())) {
        return word.toLowerCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(" ")
    .trim()
    .substring(0, 50) // Max 50 characters
}

