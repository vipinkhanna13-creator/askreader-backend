import fs from "fs";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";

const CATEGORIES = [
  { name: "Central Commentaries", slug: "central-commentaries", order: 1 },
  { name: "State Commentaries", slug: "state-commentaries", order: 2 },
  { name: "State Bare Acts", slug: "state-bare-acts", order: 3 },
  { name: "Central Bare Acts with State Amendments", slug: "central-bare-acts", order: 4 },
];

// Same eight titles as the reader/admin prototypes, tagged into all four
// categories per your earlier instruction. Bare-Act text is reproduced
// directly (statute text is excluded from copyright under Section 52 of the
// Copyright Act); the Rules of Court title uses an original summary instead
// of the publisher's own commentary text.
const BOOKS = [
  {
    title: "The Bharatiya Nyaya Sanhita, 2023",
    author_editor: "Bare Act — Government of India",
    state: "All-India",
    subject: "Criminal Law",
    edition_label: "Act No. 45 of 2023",
    effective_date: "2024-07-01",
    amendment_currency: "In force from 1 July 2024",
    sections: [
      { title: "1. Short title, commencement and application", content:
        "(1) This Act may be called the Bharatiya Nyaya Sanhita, 2023.\n" +
        "(2) It shall come into force on such date as the Central Government may, by notification in the Official Gazette, appoint, and different dates may be appointed for different provisions of this Sanhita.\n" +
        "(3) Every person shall be liable to punishment under this Sanhita and not otherwise for every act or omission contrary to the provisions thereof, of which he shall be guilty within India." },
      { title: "2. Definitions", content:
        "In this Sanhita, unless the context otherwise requires, the following expressions have the meanings assigned to them below.\n" +
        "\u201cChild\u201d means any person below the age of eighteen years. \u201cGovernment\u201d includes the Central Government, or the State Government, or both, as the case may be. \u201cInjury\u201d denotes any harm illegally caused to any person in body, mind, reputation or property." },
    ],
  },
  {
    title: "The Bharatiya Nagarik Suraksha Sanhita, 2023",
    author_editor: "Bare Act — Government of India",
    state: "All-India",
    subject: "Criminal Procedure",
    edition_label: "Act No. 46 of 2023",
    effective_date: "2024-07-01",
    amendment_currency: "In force from 1 July 2024",
    sections: [
      { title: "1. Short title, extent and commencement", content:
        "(1) This Act may be called the Bharatiya Nagarik Suraksha Sanhita, 2023.\n" +
        "(2) The provisions of this Sanhita, other than those relating to Chapters IX, XI and XII thereof, shall not apply to the State of Nagaland or to the tribal areas, but the concerned State Government may, by notification, apply such provisions with such modifications as may be specified.\n" +
        "(3) It shall come into force on such date as the Central Government may, by notification in the Official Gazette, appoint." },
      { title: "2. Definitions", content:
        "\u201cBail\u201d means release of a person accused of or suspected of commission of an offence from the custody of law upon certain conditions imposed by an officer or Court on execution by such person of a bond or a bail bond.\n" +
        "\u201cCognizable offence\u201d means an offence for which a police officer may, in accordance with the First Schedule or under any other law for the time being in force, arrest without warrant." },
    ],
  },
  {
    title: "The Bharatiya Sakshya Adhiniyam, 2023",
    author_editor: "Bare Act — Government of India",
    state: "All-India",
    subject: "Law of Evidence",
    edition_label: "Act No. 47 of 2023",
    effective_date: "2024-07-01",
    amendment_currency: "In force from 1 July 2024",
    sections: [
      { title: "1. Short title, application, commencement", content:
        "(1) This Act may be called the Bharatiya Sakshya Adhiniyam, 2023.\n" +
        "(2) It applies to all judicial proceedings in or before any Court, including Courts-martial, but not to affidavits presented to any Court or officer, nor to proceedings before an arbitrator." },
      { title: "2. Definitions", content:
        "\u201cCourt\u201d includes all Judges and Magistrates, and all persons, except arbitrators, legally authorised to take evidence.\n" +
        "\u201cDocument\u201d means any matter expressed or described or otherwise recorded upon any substance by means of letters, figures or marks, intended to be used for recording that matter, and includes electronic and digital records." },
    ],
  },
  {
    title: "The Uttar Pradesh Municipalities Act, 1916",
    author_editor: "Bare Act — Government of Uttar Pradesh",
    state: "Uttar Pradesh",
    subject: "Municipal Administration",
    edition_label: "Amended by U.P. Acts 5 & 6 of 2023",
    effective_date: "1916-07-01",
    amendment_currency: "Consolidated through 2023",
    sections: [
      { title: "1. Short title, extent and commencement", content:
        "(1) This Act may be called the Uttar Pradesh Municipalities Act, 1916.\n(2) It shall extend to the whole of Uttar Pradesh.\n(3) It shall come into force on the first day of July, 1916." },
      { title: "2. Definitions", content:
        "\u201cBuildings\u201d means a house, out-house, stable, shed, hut or other enclosure or structure whether of masonry, bricks, wood, mud, metal or any other material whatsoever, whether used as a human dwelling or otherwise." },
    ],
  },
  {
    title: "The Uttar Pradesh Municipal Corporation Act, 1959",
    author_editor: "Bare Act — Government of Uttar Pradesh",
    state: "Uttar Pradesh",
    subject: "Municipal Corporations",
    edition_label: "Amended through 2004",
    effective_date: "1960-02-01",
    amendment_currency: "Consolidated through 2004",
    sections: [
      { title: "1. Short title, extent and commencement", content:
        "(1) This Act may be called the Uttar Pradesh Municipal Corporation Act, 1959.\n(2) It extends to the whole of the State of Uttar Pradesh." },
      { title: "2. Definitions", content:
        "\u201cAdvertisement\u201d means any word, letter, model, sign, placard, board, notice, device or representation, whether illuminated or not, employed wholly or in part for the purpose of advertisement, announcement or direction." },
    ],
  },
  {
    title: "The Uttar Pradesh Revenue Code, 2006",
    author_editor: "Bare Act — Government of Uttar Pradesh",
    state: "Uttar Pradesh",
    subject: "Land Revenue",
    edition_label: "As amended",
    effective_date: "2016-02-11",
    amendment_currency: "Consolidated through 2016",
    sections: [
      { title: "1. Short title, extent and commencement", content:
        "(1) This Act may be called the Uttar Pradesh Revenue Code, 2006.\n(2) It extends to the whole of Uttar Pradesh." },
      { title: "2. Applicability of the Code", content:
        "The provisions of this Code, except Chapters VIII and IX, shall apply to the whole of Uttar Pradesh, and Chapters VIII and IX shall apply to the areas to which the enactments repealed by this Code were applicable immediately before their repeal." },
    ],
  },
  {
    title: "The Uttar Pradesh Urban Planning and Development Act, 1973",
    author_editor: "Bare Act — Government of Uttar Pradesh",
    state: "Uttar Pradesh",
    subject: "Urban Planning",
    edition_label: "Amended through 2023",
    effective_date: "1973-01-01",
    amendment_currency: "Consolidated through 2023",
    sections: [
      { title: "1. Short title and extent", content:
        "(1) This Act may be called the Uttar Pradesh Urban Planning and Development Act, 1973.\n(2) It extends to the whole of Uttar Pradesh, excluding Cantonment areas and lands owned, requisitioned or taken on lease by the Central Government for the purposes of defence." },
      { title: "2. Definitions", content:
        "\u201cAmenity\u201d includes road, water supply, street-lighting, drainage, sewerage, development of public parks and open spaces, solid waste management and disposal, sewage treatment plant, and other public works, utilities and services." },
    ],
  },
  {
    title: "Rules of Court, 1952 — with Commentary",
    author_editor: "Ravikant",
    state: "Uttar Pradesh",
    subject: "Civil Procedure",
    edition_label: "Commentary edition",
    effective_date: "2025-01-01",
    amendment_currency: "Updated through 2025",
    sections: [
      { title: "1. Introductory", content:
        "The opening chapter sets the interpretive frame for the rules that follow, situating them within the wider guarantee of access to justice." },
      { title: "2. Right of appeal and judicial discipline", content:
        "This section discusses how the rules structure the right of appeal, and surveys the treatment of judicial discipline as the principle that keeps subordinate courts bound by the pronouncements of superior courts." },
    ],
  },
];

async function main() {
  console.log("Applying schema...");
  const schema = fs.readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
  await pool.query(schema);

  console.log("Seeding categories...");
  const categoryIds = [];
  for (const c of CATEGORIES) {
    const { rows } = await pool.query(
      `INSERT INTO categories (name, slug, display_order) VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [c.name, c.slug, c.order]
    );
    categoryIds.push(rows[0].id);
  }

  console.log("Seeding plan...");
  const plan = (await pool.query(
    `INSERT INTO plans (name, duration_days, price_paise, currency, tax_rate_bps, included_category_ids, device_limit)
     VALUES ('Complete Annual', 365, 999900, 'INR', 1800, $1, 3) RETURNING *`,
    [categoryIds]
  )).rows[0];

  console.log("Seeding admin user...");
  const adminHash = await bcrypt.hash("Admin@12345", 10);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, status, email_verified_at)
     VALUES ('R. Sharma', 'admin@askreader.test', $1, 'super_admin', 'active', now())
     ON CONFLICT (email) DO NOTHING`,
    [adminHash]
  );

  console.log("Seeding demo subscriber with an active entitlement...");
  const readerHash = await bcrypt.hash("Reader@12345", 10);
  const readerRes = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, status, email_verified_at)
     VALUES ('Demo Reader', 'reader@askreader.test', $1, 'individual_subscriber', 'active', now())
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [readerHash]
  );
  const readerId = readerRes.rows[0].id;
  await pool.query(
    `INSERT INTO entitlements (user_id, plan_id, start_at, end_at, status)
     VALUES ($1, $2, now(), now() + interval '365 days', 'active')`,
    [readerId, plan.id]
  );

  console.log("Seeding books, editions, and sections...");
  for (const b of BOOKS) {
    const bookRes = await pool.query(
      `INSERT INTO books (title, author_editor, state, subject) VALUES ($1, $2, $3, $4) RETURNING id`,
      [b.title, b.author_editor, b.state, b.subject]
    );
    const bookId = bookRes.rows[0].id;

    for (const catId of categoryIds) {
      await pool.query(`INSERT INTO book_categories (book_id, category_id) VALUES ($1, $2)`, [bookId, catId]);
    }

    const editionRes = await pool.query(
      `INSERT INTO editions (book_id, version_label, effective_date, amendment_currency, file_type, storage_key, status, published_at)
       VALUES ($1, $2, $3, $4, 'html', $5, 'published', now()) RETURNING id`,
      [bookId, b.edition_label, b.effective_date, b.amendment_currency, `demo/${bookId}.html`]
    );
    const editionId = editionRes.rows[0].id;

    let order = 0;
    for (const s of b.sections) {
      await pool.query(
        `INSERT INTO edition_sections (edition_id, title, sort_order, content, search_text)
         VALUES ($1, $2, $3, $4, $4)`,
        [editionId, s.title, order++, s.content]
      );
    }
  }

  console.log("Done. Demo accounts:");
  console.log("  Admin  -> admin@askreader.test / Admin@12345");
  console.log("  Reader -> reader@askreader.test / Reader@12345 (has an active Complete Annual entitlement)");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
