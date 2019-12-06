var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/articleGenerator_DB"
mongoose.connect(MONGODB_URI);

// Each scraped article should be saved to your application database. At a minimum, the app should scrape and display the following information for each article:

//      * Headline - the title of the article

//      * Summary - a short summary of the article

//      * URL - the url to the original article

//      * Feel free to add more content to your database (photos, bylines, and so on).

app.get("/scrape", function (req, res) {
    // First, we grab the body of the html with axios
    axios.get("https://www.npr.org/sections/news/").then(function (response) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector

        let $ = cheerio.load(response.data);

        $("article").each(function (i, element) {
            var result = {};

            //   // Save an empty result object
            result.title = $(this)
                .children("div")
                .children("div")
                .children("h2")
                .children("a")
                .text();
            result.link = $(this)
                .children("div")
                .children("div")
                .children("h2")
                .children("a")
                .attr("href");
            result.image = $(this)
                .children("div")
                .children("div")
                .children("a")
                .children("img")
                .attr("src");
            result.summary = $(this)
                .children("div")
                .children("div")
                .children("p")
                .children("a")
                .text();
            
            db.Article.create(result)
                .then(function (dbResult) {
                    // View the added result in the console
                    console.log(dbResult);
                })
                .catch(function (err) {
                    // If an error occurred, log it
                    // console.log(err);
                });
        });

        // Route for getting all Articles from the db
        app.get("/articles", function (req, res) {
            // Grab every document in the Articles collection
            db.Article.find({})
                .then(function (dbResult) {
                    // If we were able to successfully find Articles, send them back to the client
                    
                    res.json(dbResult);
                })
                .catch(function (err) {
                    // If an error occurred, send it to the client
                    res.json(err);
                });
        });

        //Route for grabbing a specific Article by id, populate it with it's note
        app.get("/articles/:id", function (req, res) {
            // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
            db.Article.findOne({ _id: req.params.id })
                // ..and populate all of the notes associated with it
                .populate("comment")
                .then(function (dbResult) {
                    // If we were able to successfully find an Article with the given id, send it back to the client
                    res.json(dbResult);
                })
                .catch(function (err) {
                    // If an error occurred, send it to the client
                    res.json(err);
                });
        });

        // Route for saving/updating an Article's associated Note
        app.post("/articles/:id", function (req, res) {
            // Create a new note and pass the req.body to the entry
            db.Comments.create(req.body)
                .then(function (dbComment) {
                    // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
                    // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
                    // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
                    return db.Article.findOneAndUpdate({ _id: req.params.id }, { comment: dbComment._id }, { new: true });
                })
                .then(function (dbResult) {
                    // If we were able to successfully update an Article, send it back to the client
                    res.json(dbResult);
                })
                .catch(function (err) {
                    // If an error occurred, send it to the client
                    res.json(err);
                });
        });

        // Send a message to the client
        res.send("Scrape Complete");
    });
});



// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});
