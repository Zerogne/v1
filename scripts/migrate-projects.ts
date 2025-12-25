import { prisma } from "../lib/prisma"

/**
 * Migrate projects from default-user-migration to actual users
 * This script reassigns projects based on user email patterns or other criteria
 */
async function migrateProjects() {
  try {
    const defaultUser = await prisma.user.findUnique({
      where: { id: "default-user-migration" },
    })

    if (!defaultUser) {
      console.log("Default user not found")
      return
    }

    // Get all projects owned by default user
    const defaultProjects = await prisma.project.findMany({
      where: { userId: defaultUser.id },
    })

    console.log(`Found ${defaultProjects.length} projects owned by default user`)

    if (defaultProjects.length === 0) {
      console.log("No projects to migrate")
      return
    }

    // Reassign all projects to the first real user (k2naysaa@gmail.com)
    // You can change this to a different email if needed
    const targetUser = await prisma.user.findUnique({
      where: { email: "k2naysaa@gmail.com" },
    })

    if (!targetUser) {
      console.log("Target user not found. Please update the script with a valid email.")
      return
    }

    for (const project of defaultProjects) {
      // Also migrate related chats to the new user
      await prisma.chatSession.updateMany({
        where: { projectId: project.id },
        data: { userId: targetUser.id },
      })

      await prisma.project.update({
        where: { id: project.id },
        data: { userId: targetUser.id },
      })
      console.log(`Migrated project "${project.name}" (and its chats) to ${targetUser.email}`)
    }

    console.log("Migration complete!")
  } catch (error) {
    console.error("Error migrating projects:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrateProjects()

