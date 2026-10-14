// 원본 파일의 모든 줄이 수정본에 순서대로, 변경 없이 남아 있는지 검증한다.
//
// 사용법: node verify_only_comments_added.js <원본> <수정본>
//
// 원본 줄이 수정본의 부분 수열(subsequence)이면 OK와 함께 새로 추가된 줄을 출력하고,
// 아니면 FAIL과 함께 찾지 못한 첫 원본 줄을 출력한다 (종료 코드 1).
// 줄 끝 공백과 줄바꿈 문자(CRLF/LF) 차이는 무시한다.
const fs = require("fs");

function readLines(path) {
  return fs.readFileSync(path, "utf8").split(/\r?\n/).map((l) => l.trimEnd());
}

if (process.argv.length !== 4) {
  console.log("사용법: node verify_only_comments_added.js <원본> <수정본>");
  process.exit(2);
}
const original = readLines(process.argv[2]);
const modified = readLines(process.argv[3]);

const added = []; // [수정본 줄 번호, 내용]
let j = 0;
for (let i = 0; i < original.length; i++) {
  // 원본 줄과 같은 줄이 나올 때까지 수정본을 앞으로 진행; 그 사이 줄은 추가된 줄
  while (j < modified.length && modified[j] !== original[i]) {
    added.push([j + 1, modified[j]]);
    j++;
  }
  if (j === modified.length) {
    console.log(`FAIL: 원본 ${i + 1}번째 줄이 수정본에서 그대로 발견되지 않음 (변경/삭제/순서 변경 의심)`);
    console.log(`  원본 줄: ${JSON.stringify(original[i])}`);
    process.exit(1);
  }
  j++;
}
for (; j < modified.length; j++) added.push([j + 1, modified[j]]);

console.log(`OK: 원본 ${original.length}줄 모두 그대로 유지됨. 추가된 줄 ${added.length}개:`);
for (const [num, text] of added) console.log(`  +${num}: ${text}`);
