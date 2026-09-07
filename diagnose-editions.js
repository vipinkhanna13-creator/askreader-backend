import { pool } from "./db.js";

async function main() {
  const { rows: books } = await pool.query(`SELECT id, title FROM books ORDER BY title`);

  for (const book of books) {
    const { rows: editions } = await pool.query(
      `SELECT id, status, created_at,
              (SELECT count(*) FROM edition_sections es WHERE es.edition_id = editions.id) AS section_count
       FROM editions WHERE book_id = $1 ORDER BY created_at`,
      [book.id]
    );
    if (editions.length > 1) {
      console.log(`\n⚠ MULTIPLE EDITIONS: ${book.title}`);
    } else {
      console.log(`\n${book.title}`);
    }
    editions.forEach((e) => {
      console.log(`   edition ${e.id.slice(0, 8)}… status=${e.status} sections=${e.section_count} created=${e.created_at}`);
    });
  }
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
