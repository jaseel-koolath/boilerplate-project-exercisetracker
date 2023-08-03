const express = require('express')
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(
  process.env.MONGO_URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) console.log(err);
    else console.log("mongdb is connected");
  }
);
let userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  log: [
    {
      description: String,
      duration: Number,
      date: Date,
    },
  ],
});
let User = new mongoose.model("User", userSchema);

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
app.use(bodyParser.urlencoded({ extended: false }));
app.post("/api/users", (req, res) => {
  let user = User({ username: req.body.username });
  user.save((err, data) => {
    if (err) console.log(err);
    else {
      res.json({ username: data.username, _id: data._id });
    }
  });
});

app.post("/api/users/:_id/exercises", (req, res) => {
  const id = req.params._id;
  const description = req.body.description;
  const duration = Number(req.body.duration);
  const date = new Date(req.body.date);

  User.findOneAndUpdate(
    { _id: id },
    { $push: { log: { description, duration, date } } },
    { new: true }
  )
    .then((updatedUser) => {
      if (!updatedUser) {
        // Handle the case when user not found
        return res.status(404).json({ error: "User not found." });
      }
      res.json({
        username: updatedUser.username,
        description,
        duration,
        date: date.toDateString(),
        _id: updatedUser._id,
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    });
});
app.get("/api/users/", (req, res) => {
  User.find()
    .then((doc) => {
      const result = doc.map((user) => ({
        username: user.username,
        _id: user._id,
      }));
      res.json(result);
    })
    .catch((err) => {
      res.status(500).json({ error: "Server error." });
    });
});

app.get("/api/users/:_id/logs", (req, res) => {
  const id = req.params._id;
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  const filteredLogs = [];
  const limit = isNaN(req.query.limit) ? null : Number(req.query.limit); // Optional parameter
  User.findById(id)
    .then((user) => {
      if (!user) {
        // Handle the case when user not found
        return res.status(404).json({ error: "User not found." });
      }
      if (user?.log?.length > 0) {
        filteredLogs.push(
          ...user.log.map((item) => ({
            description: item.description,
            duration: item.duration,
            date: item.date,
          }))
        );
      }
      if (from instanceof Date && !isNaN(from.getTime())) {
        // 'from' is a valid date
        filteredLogs.splice(
          0,
          filteredLogs.length,
          ...filteredLogs.filter((log) => {
            const date = new Date(log.date);
            return from <= date;
          })
        );
      }
      if (to instanceof Date && !isNaN(to.getTime())) {
        // 'to' is a valid date
        filteredLogs.splice(
          0,
          filteredLogs.length,
          ...filteredLogs.filter((log) => {
            const date = new Date(log.date);
            return to >= date;
          })
        );
      }
      if (limit) filteredLogs.sort((a, b) => a.date - b.date).splice(0, limit);
      console.log({
        username: user.username,
        count: user.log.length,
        _id: user._id,
        log: filteredLogs,
      });
      res.json({
        // username: user.username,
        count: user.log.length,
        // _id: user._id,
        log: filteredLogs.map((log) => ({
          ...log,
          date: log.date.toDateString(),
        })),
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
