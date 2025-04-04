const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello Express!');
});


const userRoute = require('./routes/user');
app.use('./api/users',userRoute);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
