# SafeSend

Encrypted file and text sharing with self-destructing links. Files are encrypted in the browser using AES-256-GCM before they ever reach the server, and the encryption key stays in the URL fragment so the server never sees it. Every link works once then the file is permanently deleted.

**Live:** https://safesend-9yq5.onrender.com

## How It Works

The sender picks a file or types a message. The browser generates an AES-256-GCM key and encrypts everything client-side using the Web Crypto API. The encrypted data gets uploaded to the server, which stores it and returns a unique token. The shareable link looks like `/d/abc123#encryptionKey` where the part after `#` is the decryption key. Since URL fragments are never sent to the server, the server only ever holds encrypted data it cannot read.

When the recipient opens the link, the browser fetches the encrypted data, decrypts it locally using the key from the fragment, and either downloads the file or displays the text. The server deletes the data immediately after the first download. Any files not downloaded within 10 minutes are automatically cleaned up.

## Tech Stack

Node.js and Express for the backend, SQLite via better-sqlite3 for metadata, vanilla HTML/CSS/JavaScript for the frontend, and the Web Crypto API for all encryption. Deployed on Render.

## Security Model

The server is zero-knowledge by design. It receives and stores only encrypted blobs. The AES-256-GCM key exists only in the URL fragment which browsers never include in HTTP requests. Even if someone accessed the server directly, they would find nothing but unreadable encrypted data. Files are deleted after a single download or after 10 minutes, whichever comes first.

## Running Locally

```
git clone https://github.com/mohammedgharamah1/safesend.git
cd safesend
npm install
npm start
```

Open http://localhost:3000 and try uploading a file or sending encrypted text.
