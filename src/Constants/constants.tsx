export const InitialVal = `# Welcome to LiveDraft

**Features**

- _Custom Toolbar_
- _HTML Support_
- _Live Preview_
- _Download File_

---

Start writing your README here.`;

export const htmlDefault = `<h1>Hello World</h1>
<p>Start building something amazing.</p>`;

export const cssDefault = `body {
  font-family: system-ui, sans-serif;
  text-align: center;
  padding: 2rem;
}`;

export const tsDefault = `interface User {
  name: string;
  age: number;
  email: string;
}

function greet(user: User): string {
  return \`Hello, \${user.name}! You are \${user.age} years old.\`;
}

const user: User = {
  name: "LiveDraft",
  age: 1,
  email: "hello@livedraft.dev"
};

console.log(greet(user));

// Try installing packages!
// Type "npm install lodash" in the terminal below
`;
