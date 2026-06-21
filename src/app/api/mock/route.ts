import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

function getWeekStart(offsetWeeks = 0) {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff + offsetWeeks * 7)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

export async function POST() {
  const db = getDb()

  // Inventory — fryser
  const freezerItems = [
    { name: 'Hakket oksekød', category: 'kød', quantity: '500g', location: 'freezer' },
    { name: 'Kyllingefileter', category: 'kød', quantity: '4 stk', location: 'freezer' },
    { name: 'Laks', category: 'fisk', quantity: '600g', location: 'freezer' },
    { name: 'Rejer', category: 'fisk', quantity: '250g', location: 'freezer' },
    { name: 'Ærter', category: 'grønt', quantity: '500g', location: 'freezer' },
    { name: 'Spinat', category: 'grønt', quantity: '300g', location: 'freezer' },
    { name: 'Frosne bønner', category: 'grønt', quantity: '400g', location: 'freezer' },
    { name: 'Ciabatta', category: 'andet', quantity: '2 stk', location: 'freezer' },
  ]

  // Inventory — spisekammer
  const pantryItems = [
    { name: 'Pasta (penne)', category: 'andet', quantity: '500g', location: 'pantry' },
    { name: 'Spaghetti', category: 'andet', quantity: '500g', location: 'pantry' },
    { name: 'Basmatiris', category: 'andet', quantity: '1 kg', location: 'pantry' },
    { name: 'Hakkede tomater', category: 'grønt', quantity: '3 dåser', location: 'pantry' },
    { name: 'Kokosmælk', category: 'andet', quantity: '2 dåser', location: 'pantry' },
    { name: 'Kikærter', category: 'andet', quantity: '2 dåser', location: 'pantry' },
    { name: 'Linser (røde)', category: 'andet', quantity: '400g', location: 'pantry' },
    { name: 'Løg', category: 'grønt', quantity: '4 stk', location: 'pantry' },
    { name: 'Hvidløg', category: 'grønt', quantity: '1 hoved', location: 'pantry' },
    { name: 'Olivenolie', category: 'andet', quantity: '½ flaske', location: 'pantry' },
    { name: 'Sojasauce', category: 'andet', quantity: '1 flaske', location: 'pantry' },
    { name: 'Karry', category: 'andet', quantity: '50g', location: 'pantry' },
    { name: 'Spidskommen', category: 'andet', quantity: '30g', location: 'pantry' },
    { name: 'Dåsemajs', category: 'grønt', quantity: '2 dåser', location: 'pantry' },
  ]

  const insertItem = db.prepare(`
    INSERT INTO inventory_items (name, category, quantity, location)
    VALUES (@name, @category, @quantity, @location)
  `)
  for (const item of [...freezerItems, ...pantryItems]) {
    insertItem.run(item)
  }

  // Meals (til historik og favoritter)
  const meals = [
    {
      name: 'Spaghetti Bolognese', description: 'Klassisk italiensk kødsovs med spaghetti', prep_time: 45,
      ingredients: JSON.stringify(['500g hakket oksekød', '2 dåser hakkede tomater', '400g spaghetti', '1 løg', '3 fed hvidløg', 'Oregano']),
      recipe: JSON.stringify(['Hak løg og hvidløg fint og svits i olivenolie.', 'Brun det hakkede kød grundigt.', 'Tilsæt hakkede tomater og oregano, lad simre 20 min.', 'Kog spaghetti efter anvisning.', 'Anret og server med revet parmesan.']),
      avg_rating: 4.5, rating_count: 4, is_favorite: 1,
    },
    {
      name: 'Kylling i karry', description: 'Mild karrygryde med kylling og ris', prep_time: 35,
      ingredients: JSON.stringify(['4 kyllingefileter', '2 dåser kokosmælk', '2 spsk karry', '1 løg', '400g ris']),
      recipe: JSON.stringify(['Skær kylling i tern og brun i en varm gryde.', 'Tilsæt hakket løg og karry, steg 2 min.', 'Hæld kokosmælk i og lad simre 20 min.', 'Kog ris separat og server til.']),
      avg_rating: 4.8, rating_count: 5, is_favorite: 1,
    },
    {
      name: 'Laksepasta', description: 'Cremet pasta med laks og spinat', prep_time: 25,
      ingredients: JSON.stringify(['400g laks', '400g penne', '200g spinat', '2 dl fløde', '2 fed hvidløg']),
      recipe: JSON.stringify(['Kog pasta al dente.', 'Steg laks i tern med hvidløg i smør.', 'Tilsæt fløde og spinat, varm igennem.', 'Bland med pasta og server.']),
      avg_rating: 4.2, rating_count: 3, is_favorite: 0,
    },
    {
      name: 'Tacos med oksekød', description: 'Mexicansk-inspirerede tacos til hele familien', prep_time: 30,
      ingredients: JSON.stringify(['500g hakket oksekød', '8 tacos', '1 dåse majs', 'Salat', 'Tomater', 'Rød salsa']),
      recipe: JSON.stringify(['Brun kødet med taco-krydderi.', 'Skær grøntsager i strimler.', 'Varm tacoskaller i ovn 5 min.', 'Anret på bordet og lad alle fylde selv.']),
      avg_rating: 4.6, rating_count: 6, is_favorite: 1,
    },
    {
      name: 'Rejerisotto', description: 'Cremet risotto med rejer og parmesan', prep_time: 40,
      ingredients: JSON.stringify(['250g rejer', '300g risottoris', '1 l grøntsagsbouillon', '50g parmesan', '1 løg', '2 dl hvidvin']),
      recipe: JSON.stringify(['Svits løg i smør til det er blødt.', 'Tilsæt risottoris og rør 2 min.', 'Hæld hvidvin i og lad det absorbere.', 'Tilsæt bouillon lidt ad gangen under konstant omrøring.', 'Rør rejer og parmesan i og server straks.']),
      avg_rating: 3.8, rating_count: 2, is_favorite: 0,
    },
    {
      name: 'Kikærtesuppe', description: 'Krydret kikærtesuppe med brød', prep_time: 30,
      ingredients: JSON.stringify(['2 dåser kikærter', '1 dåse hakkede tomater', '1 løg', '3 fed hvidløg', '2 spsk spidskommen']),
      recipe: JSON.stringify(['Svits løg og hvidløg i olivenolie.', 'Tilsæt spidskommen og steg 1 min.', 'Tilsæt kikærter og tomater, lad simre 15 min.', 'Blend halvdelen for cremet konsistens.', 'Server med godt brød.']),
      avg_rating: 4.0, rating_count: 3, is_favorite: 0,
    },
  ]

  const insertMeal = db.prepare(`
    INSERT INTO meals (name, description, prep_time, ingredients, recipe, avg_rating, rating_count, is_favorite, last_made_at)
    VALUES (@name, @description, @prep_time, @ingredients, @recipe, @avg_rating, @rating_count, @is_favorite, @last_made_at)
  `)

  const mealIds: number[] = []
  const now = new Date()
  for (let i = 0; i < meals.length; i++) {
    const daysAgo = (i + 1) * 8
    const madeAt = new Date(now)
    madeAt.setDate(madeAt.getDate() - daysAgo)
    const result = insertMeal.run({ ...meals[i], last_made_at: madeAt.toISOString().split('T')[0] })
    mealIds.push(result.lastInsertRowid as number)
  }

  // Meal history
  const insertHistory = db.prepare(`
    INSERT INTO meal_history (meal_id, meal_name, made_at, stars)
    VALUES (?, ?, ?, ?)
  `)
  for (let i = 0; i < meals.length; i++) {
    const daysAgo = (i + 1) * 8
    const madeAt = new Date(now)
    madeAt.setDate(madeAt.getDate() - daysAgo)
    insertHistory.run(mealIds[i], meals[i].name, madeAt.toISOString().split('T')[0], Math.round(meals[i].avg_rating))
  }

  // Weekly plan — denne uge
  const thisWeek = getWeekStart(0)
  const weekPlan = [
    { day: 0, name: 'Spaghetti Bolognese', description: 'Klassisk italiensk kødsovs med spaghetti', ingredients: ['500g hakket oksekød', '2 dåser hakkede tomater', '400g spaghetti', '1 løg', '3 fed hvidløg'], recipe: ['Hak løg og hvidløg fint og svits i olivenolie.', 'Brun det hakkede kød grundigt.', 'Tilsæt hakkede tomater og lad simre 20 min.', 'Kog spaghetti efter anvisning.', 'Anret og server med revet parmesan.'], prep_time: 45, status: 'done' },
    { day: 1, name: 'Spaghetti Bolognese', description: 'Rester fra mandag', ingredients: [], recipe: [], prep_time: 5, status: 'planned', is_leftover: 1 },
    { day: 2, name: 'Kylling i karry', description: 'Mild karrygryde med kylling og ris', ingredients: ['4 kyllingefileter', '2 dåser kokosmælk', '2 spsk karry', '1 løg', '400g ris'], recipe: ['Skær kylling i tern og brun i en gryde.', 'Tilsæt hakket løg og karry, steg 2 min.', 'Hæld kokosmælk i og lad simre 20 min.', 'Kog ris separat og server til.'], prep_time: 35, status: 'planned' },
    { day: 3, name: null, status: 'eaten_out' },
    { day: 4, name: 'Laksepasta', description: 'Cremet pasta med laks og spinat', ingredients: ['400g laks', '400g penne', '200g spinat', '2 dl fløde', '2 fed hvidløg'], recipe: ['Kog pasta al dente.', 'Steg laks i tern med hvidløg.', 'Tilsæt fløde og spinat, varm igennem.', 'Bland med pasta og server.'], prep_time: 25, status: 'planned' },
    { day: 5, name: 'Tacos med oksekød', description: 'Mexicansk-inspirerede tacos', ingredients: ['500g hakket oksekød', '8 tacos', '1 dåse majs', 'Salat', 'Tomater'], recipe: ['Brun kødet med taco-krydderi.', 'Skær grøntsager i strimler.', 'Varm tacoskaller i ovn 5 min.', 'Anret på bordet og lad alle fylde selv.'], prep_time: 30, status: 'planned' },
    { day: 6, name: null, status: 'no_cooking' },
  ]

  const insertPlan = db.prepare(`
    INSERT OR REPLACE INTO weekly_plan
      (week_start, day_of_week, meal_name, meal_description, meal_ingredients, meal_prep_time, meal_recipe, status, is_leftover)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const p of weekPlan) {
    insertPlan.run(
      thisWeek,
      p.day,
      p.name ?? null,
      (p as { description?: string }).description ?? null,
      JSON.stringify((p as { ingredients?: string[] }).ingredients ?? []),
      (p as { prep_time?: number }).prep_time ?? null,
      JSON.stringify((p as { recipe?: string[] }).recipe ?? []),
      p.status,
      (p as { is_leftover?: number }).is_leftover ?? 0
    )
  }

  // Shopping list — denne uge
  const shoppingItems = [
    { name: 'Frisk basilikum', quantity: '1 bundt', is_checked: 0 },
    { name: 'Parmesan', quantity: '100g', is_checked: 0 },
    { name: 'Fløde', quantity: '2 dl', is_checked: 1 },
    { name: 'Tacoskaller', quantity: '1 pakke', is_checked: 0 },
    { name: 'Cherrytomater', quantity: '250g', is_checked: 0 },
    { name: 'Agurk', quantity: '1 stk', is_checked: 1 },
    { name: 'Rødløg', quantity: '2 stk', is_checked: 0 },
    { name: 'Creme fraiche', quantity: '200g', is_checked: 0 },
  ]

  const insertShopping = db.prepare(`
    INSERT INTO shopping_items (week_start, name, quantity, is_checked)
    VALUES (?, ?, ?, ?)
  `)
  for (const item of shoppingItems) {
    insertShopping.run(thisWeek, item.name, item.quantity, item.is_checked)
  }

  return NextResponse.json({ ok: true, message: 'Testdata indlæst' })
}

export async function DELETE() {
  const db = getDb()

  db.prepare(`DELETE FROM inventory_items WHERE added_at >= datetime('now', '-1 minute', 'localtime') OR 1=1`).run()
  db.prepare(`DELETE FROM inventory_items`).run()
  db.prepare(`DELETE FROM meal_history`).run()
  db.prepare(`DELETE FROM meal_ratings`).run()
  db.prepare(`DELETE FROM meals`).run()
  db.prepare(`DELETE FROM weekly_plan`).run()
  db.prepare(`DELETE FROM shopping_items WHERE is_permanent = 0`).run()

  return NextResponse.json({ ok: true, message: 'Testdata ryddet' })
}
