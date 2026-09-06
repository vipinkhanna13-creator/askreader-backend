import fs from "fs";
import { pool } from "./db.js";

async function main() {
  const books = JSON.parse(fs.readFileSync(new URL("./full_content.json", import.meta.url), "utf8"));

  for (const book of books) {
    const bookRes = await pool.query(`SELECT id FROM books WHERE title = $1`, [book.title]);
    const dbBook = bookRes.rows[0];
    if (!dbBook) {
      console.log(`SKIP — book not found in database: ${book.title}`);
      continue;
    }

    const editionRes = await pool.query(
      `SELECT id FROM editions WHERE book_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [dbBook.id]
    );
    const edition = editionRes.rows[0];
    if (!edition) {
      console.log(`SKIP — no edition found for: ${book.title}`);
      continue;
    }

    // Replace entirely — this book's earlier 2-4 excerpt sections are removed
    // and the full parsed structure takes their place.
    await pool.query(`DELETE FROM edition_sections WHERE edition_id = $1`, [edition.id]);

    let order = 0;
    let sectionCount = 0;
    for (const chapter of book.chapters) {
      for (const section of chapter.sections) {
        const fullTitle = `${section.title}`;
        await pool.query(
          `INSERT INTO edition_sections (edition_id, title, sort_order, content, search_text)
           VALUES ($1, $2, $3, $4, $4)`,
          [edition.id, fullTitle, order++, section.content]
        );
        sectionCount++;
      }
    }
    console.log(`${book.title}: loaded ${sectionCount} sections across ${book.chapters.length} chapters`);
  }

  console.log("\nDone.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
