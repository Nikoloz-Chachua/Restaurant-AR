import { readFileSync } from 'node:fs';

const files = ['index.html', 'big-sams.html'];
const oldGeorgianCta = 'აჩვენე ოფიციანტს';
const newGeorgianCta = 'აჩვენეთ სერვისის თანამშრომელს';
const oldGeorgianHint = 'ოფიციანტი დაასკანერებს და მყისვე მიიღებს შენს შეკვეთას';
const newGeorgianHint = 'სერვისის თანამშრომელი დაასკანერებს და მყისვე მიიღებს შენს შეკვეთას';
const englishCta = 'Show to waiter';

let failed = false;

for (const file of files) {
  const text = readFileSync(file, 'utf8');

  if (text.includes(oldGeorgianCta)) {
    console.error(`${file}: old Georgian waiter CTA is still present`);
    failed = true;
  }

  if (!text.includes(newGeorgianCta)) {
    console.error(`${file}: new Georgian waiter CTA is absent`);
    failed = true;
  }

  if (text.includes(oldGeorgianHint)) {
    console.error(`${file}: old Georgian waiter hint is still present`);
    failed = true;
  }

  if (!text.includes(newGeorgianHint)) {
    console.error(`${file}: new Georgian waiter hint is absent`);
    failed = true;
  }

  if (!text.includes(englishCta)) {
    console.error(`${file}: English waiter CTA changed or is absent`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('Customer waiter CTA localization check passed');
