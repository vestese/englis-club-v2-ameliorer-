/* =====================================================================
   scripts/validate.js — Automated Content & Data Validation Script
   Run via Node.js: node scripts/validate.js
   ===================================================================== */

const fs = require('fs');
const path = require('path');

function validateContent() {
  const contentPath = path.join(__dirname, '..', 'content', 'content.js');
  if (!fs.existsSync(contentPath)) {
    console.error('❌ Error: content/content.js not found at ' + contentPath);
    process.exit(1);
  }

  const code = fs.readFileSync(contentPath, 'utf8');

  // Setup minimal browser context for Node
  const window = {};
  const globalContext = { window };

  try {
    const fn = new Function('window', code);
    fn(window);
  } catch (err) {
    console.error('❌ Syntax Error in content/content.js:', err.message);
    process.exit(1);
  }

  const content = window.CAA && window.CAA.content;
  if (!content) {
    console.error('❌ Error: window.CAA.content is undefined.');
    process.exit(1);
  }

  let errors = 0;
  let warnings = 0;

  console.log('\n==================================================');
  console.log('🔍 ACCRA ENGLISH CLUB — CONTENT VALIDATION REPORT');
  console.log('==================================================\n');

  // 1. Vocabulary Validation
  const vocab = content.vocabulary || [];
  console.log(`📚 Vocabulary count: ${vocab.length} words`);

  if (vocab.length < 600) {
    console.error(`❌ ERROR: Vocabulary size (${vocab.length}) is under 600 words!`);
    errors++;
  } else {
    console.log(`✅ Vocabulary size requirement met (${vocab.length} words).`);
  }

  // Duplicate word check
  const seenWords = new Map();
  vocab.forEach((w, idx) => {
    if (!w.en || typeof w.en !== 'string') {
      console.error(`❌ ERROR at vocabulary index ${idx}: missing or invalid 'en' property.`);
      errors++;
      return;
    }
    const cleanWord = w.en.trim().toLowerCase();
    if (seenWords.has(cleanWord)) {
      console.error(`❌ DUPLICATE WORD: "${w.en}" found at index ${idx} (previously at ${seenWords.get(cleanWord)})`);
      errors++;
    } else {
      seenWords.set(cleanWord, idx);
    }

    if (!w.fr) {
      console.warn(`⚠️ Warning at index ${idx} ("${w.en}"): missing 'fr' translation.`);
      warnings++;
    }
    if (!w.meaning) {
      console.warn(`⚠️ Warning at index ${idx} ("${w.en}"): missing 'meaning' definition.`);
      warnings++;
    }
  });

  // Duplicate emoji check
  const seenEmojis = new Map();
  vocab.forEach((w, idx) => {
    if (!w.emoji || typeof w.emoji !== 'string') {
      console.error(`❌ ERROR at vocabulary index ${idx} ("${w.en}"): missing or invalid 'emoji' property.`);
      errors++;
      return;
    }
    const cleanEmoji = w.emoji.trim();
    if (seenEmojis.has(cleanEmoji)) {
      console.error(`❌ DUPLICATE EMOJI: "${cleanEmoji}" used for "${w.en}" at index ${idx} (already used for "${seenEmojis.get(cleanEmoji)}")`);
      errors++;
    } else {
      seenEmojis.set(cleanEmoji, w.en);
    }
  });

  // Categories count
  const categories = {};
  vocab.forEach((w) => {
    const cat = w.cat || 'uncategorized';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  console.log('\n📂 Vocabulary Breakdown by Category:');
  Object.keys(categories).sort().forEach((cat) => {
    console.log(`   - ${cat}: ${categories[cat]} words`);
  });

  // 2. Spelling Words Validation (Tiered objects)
  const spellingWords = content.spellingWords || [];
  console.log(`\n🐝 Dedicated Spelling Words count: ${spellingWords.length}`);
  const tiers = { easy: 0, medium: 0, hard: 0 };
  spellingWords.forEach((s, idx) => {
    const wordStr = typeof s === 'string' ? s : s.word;
    const tier = typeof s === 'object' ? s.tier : 'medium';
    if (!wordStr) {
      console.error(`❌ ERROR in spellingWords index ${idx}: missing word string.`);
      errors++;
    }
    if (tiers[tier] !== undefined) {
      tiers[tier]++;
    } else {
      console.error(`❌ ERROR in spellingWords index ${idx}: unknown tier "${tier}".`);
      errors++;
    }
  });
  console.log(`   - Easy tier: ${tiers.easy}`);
  console.log(`   - Medium tier: ${tiers.medium}`);
  console.log(`   - Hard tier: ${tiers.hard}`);

  // 3. Grammar Validation
  const grammar = content.grammar || [];
  console.log(`\n📝 Grammar sentences count: ${grammar.length}`);

  // 4. Anagram Words Validation
  const anagramWords = content.anagramWords || [];
  console.log(`🔤 Anagram words count: ${anagramWords.length}`);

  // 5. Speaking Prompts Validation
  const speakingPrompts = content.speakingPrompts || [];
  console.log(`🗣️ Speaking prompts count: ${speakingPrompts.length}`);

  // 6. Phrasal Verbs Validation
  const phrasalVerbs = content.phrasalVerbs || [];
  console.log(`🔗 Phrasal verbs count: ${phrasalVerbs.length}`);
  phrasalVerbs.forEach((item, idx) => {
    if (!item.verb) {
      console.error(`❌ ERROR in phrasalVerbs index ${idx}: missing 'verb'.`);
      errors++;
    }
    if (!item.meaning && !item.fr) {
      console.error(`❌ ERROR in phrasalVerbs index ${idx}: missing both 'meaning' and 'fr'.`);
      errors++;
    }
  });

  // 7. Irregular Verbs Validation
  const irregularVerbs = content.irregularVerbs || [];
  console.log(`🔁 Irregular verbs count: ${irregularVerbs.length}`);
  irregularVerbs.forEach((item, idx) => {
    if (!item.verb) {
      console.error(`❌ ERROR in irregularVerbs index ${idx}: missing 'verb'.`);
      errors++;
    }
    if (!item.past || !item.participle) {
      console.error(`❌ ERROR in irregularVerbs index ${idx}: missing past or participle.`);
      errors++;
    }
  });

  // 8. Preposition questions validation
  const prepositionQuestions = (content.grammar || []).filter((item) => (item.cat || '').toLowerCase().includes('preposition'));
  console.log(`📍 Preposition grammar questions: ${prepositionQuestions.length}`);

  // 9. Le Grand Défi Validation
  const grandDefi = content.grandDefi || [];
  let totalGDQuestions = 0;
  grandDefi.forEach((topic, tIdx) => {
    const questions = topic.questions || [];
    totalGDQuestions += questions.length;
    questions.forEach((q, qIdx) => {
      if (!q.choices || !Array.isArray(q.choices)) {
        console.error(`❌ ERROR in Grand Défi topic "${topic.topic}" Q${qIdx + 1}: 'choices' is missing or not an array.`);
        errors++;
      } else if (!q.choices.includes(q.answer)) {
        console.error(`❌ ERROR in Grand Défi topic "${topic.topic}" Q${qIdx + 1}: answer "${q.answer}" is NOT in choices [${q.choices.join(', ')}]`);
        errors++;
      }
    });
  });
  console.log(`🏆 Grand Défi: ${grandDefi.length} topics, ${totalGDQuestions} total questions.`);

  // 10. Mystery Gifts Validation
  const gifts = content.gifts || [];
  console.log(`🎁 Mystery Gifts total: ${gifts.length}`);

  // 11. Final Summary
  console.log('\n==================================================');
  if (errors > 0) {
    console.error(`❌ VALIDATION FAILED with ${errors} error(s) and ${warnings} warning(s).`);
    process.exit(1);
  } else {
    console.log(`✨ VALIDATION PASSED SUCCESSFULLY! (0 errors, ${warnings} warnings)`);
    console.log('==================================================\n');
  }
}

validateContent();
