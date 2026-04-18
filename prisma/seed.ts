import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

interface ExerciseData {
  name: string
  primaryMuscle: string
  secondaryMuscles: string[]
  equipment: string | null
  category: string | null
  instructions: string | null
  isCustom: boolean
  gifUrl: string | null
}

async function main() {
  try {
    console.log('Starting seed process...')

    const exercisesPath = path.join(__dirname, 'exercises.json')
    const exercisesData: ExerciseData[] = JSON.parse(
      fs.readFileSync(exercisesPath, 'utf-8')
    )

    console.log(`Loaded ${exercisesData.length} exercises from exercises.json`)
    console.log('Upserting exercises into database...')

    let successCount = 0
    for (const exercise of exercisesData) {
      try {
        await prisma.exercise.upsert({
          where: { name: exercise.name },
          update: {
            primaryMuscle: exercise.primaryMuscle,
            secondaryMuscles: exercise.secondaryMuscles,
            equipment: exercise.equipment,
            category: exercise.category,
            instructions: exercise.instructions,
            isCustom: exercise.isCustom,
            gifUrl: exercise.gifUrl,
          },
          create: {
            name: exercise.name,
            primaryMuscle: exercise.primaryMuscle,
            secondaryMuscles: exercise.secondaryMuscles,
            equipment: exercise.equipment,
            category: exercise.category,
            instructions: exercise.instructions,
            isCustom: exercise.isCustom,
            gifUrl: exercise.gifUrl,
          },
        })
        successCount++
      } catch (error) {
        console.error(`Failed to upsert exercise "${exercise.name}":`, error)
      }
    }

    console.log(`Successfully upserted ${successCount}/${exercisesData.length} exercises`)

    console.log('Creating default Settings if needed...')
    const existingSettings = await prisma.settings.findUnique({
      where: { id: 'default' },
    })

    if (!existingSettings) {
      await prisma.settings.create({
        data: {
          id: 'default',
          dailyCalorieTarget: 2800,
          dailyProteinTarget: 180,
          dailyCarbTarget: 350,
          dailyFatTarget: 70,
          sleepGoalHours: 8,
        },
      })
      console.log('Created default Settings')
    } else {
      console.log('Default Settings already exist')
    }

    console.log('Seed completed successfully!')
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
