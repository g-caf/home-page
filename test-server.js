const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Hello from test server!');
});

app.listen(PORT, () => {
  console.log(`Test server started on port ${PORT}`);
});
