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

    // Replace entirely — this book's earlier excerpt sections are removed
    // and the full parsed structure takes their place, this time preserving
    // chapter grouping via parent_id so the reader can show a real TOC
    // instead of one flat list of hundreds of sections.
    await pool.query(`DELETE FROM edition_sections WHERE edition_id = $1`, [edition.id]);

    let sectionCount = 0;
    let chapterIdx = 0;
    for (const chapter of book.chapters) {
      // Give each chapter a wide sort_order band (chapterIdx * 10000) so a
      // single flat "ORDER BY sort_order" keeps chapters and their sections
      // correctly interleaved without needing a join at query time.
      const chapterOrder = chapterIdx * 10000;
      const chapterRes = await pool.query(
        `INSERT INTO edition_sections (edition_id, parent_id, title, sort_order, content)
         VALUES ($1, NULL, $2, $3, NULL) RETURNING id`,
        [edition.id, chapter.chapterTitle, chapterOrder]
      );
      const chapterId = chapterRes.rows[0].id;

      let subOrder = 1;
      for (const section of chapter.sections) {
        await pool.query(
          `INSERT INTO edition_sections (edition_id, parent_id, title, sort_order, content, search_text)
           VALUES ($1, $2, $3, $4, $5, $5)`,
          [edition.id, chapterId, section.title, chapterOrder + subOrder, section.content]
        );
        subOrder++;
        sectionCount++;
      }
      chapterIdx++;
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
