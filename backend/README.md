# Elysia with Bun runtime

## Development
To start the development server run:
```bash
bun run dev
```

## Curl for testing agent

curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "12dea96f-ec20-0935-a6ab-75692c994959",
    "text": "Hello eliza",
    "agentId": "416659f6-a8ab-4d90-87b5-fd5635ebe37d",
    "walletAddress": "0xf672715f2bA85794659a7150e8C21F8d157bFe1D"
  }'
