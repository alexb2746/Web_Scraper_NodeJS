(function() {
    const cheerio = require('cheerio'),
        request = require('request'),
        fs = require('fs'),
        rp = require('request-promise'),
        csv = require("fast-csv");

    // check if the data folder exsits
    if (!fs.existsSync('./data/')) {
        fs.mkdir('./data/');
    }

    // Create date to name csv file with
    const date = new Date();
    let today = date.getFullYear();
        today += '-' + date.getMonth();
        today += '-' + date.getDay();

    var csvStream = csv.createWriteStream({headers: false}),
        writableStream = fs.createWriteStream("./data/" + today + ".csv");

    csvStream.pipe(writableStream);
    // Write the needed headers in order 
    csvStream.write(
        {
            a: "Title",
            b: "Price",
            c: "ImageURL",
            d: "URL",
            e: "Time"
        }
    );

    // options to grab the shirts page with a promise
    const shirts = {
        uri: 'http://www.shirts4mike.com/shirts.php',
        transform: function (body) {
            return cheerio.load(body);
        }
    };

    /*
        Using the "request-promise" module to scrape the website for
        all the individual shirt urls, then re-use the module on each of those
        pages to grab the necessary information then call the writeCSVLine
        function to write this information to the csv file
    */
    rp(shirts)
        .then(function ($) {
            const shirtURLS = [];
            $('.products li a').each(function() {
                shirtURLS.push($(this).attr('href'));
            });
            for (let i = 0; i < shirtURLS.length; i++) {
                const shirt = {
                    uri: 'http://www.shirts4mike.com/' + shirtURLS[i],
                    transform: function(body) {
                        return cheerio.load(body);
                    }
                }
                rp(shirt)
                    .then(function ($) {
                        let row = {};
                        row.a = $('img').attr('alt');
                        row.b = $('.price').text();
                        row.c = 'http://www.shirts4mike.com/' + $('img').attr('src');
                        row.d = 'http://www.shirts4mike.com/' + shirtURLS[i];
                        row.e = new Date().toString();
                        writeCSVLine(row);
                    })
                    .catch(function (err) {
                        console.error('Error with individual shirt page: ' + err);
                        logError(err);
                });
            }
        })
        .catch(function (err) {
            console.error('There was an error, please try again later: ' + err);
            logError(err);
    })

    // Write to csv file
    function writeCSVLine(row) {
        csvStream.write(row);
    }

    // Create and log error message to 'error-log.txt' file
    function logError(error) {
        fs.lstat('error-log.txt', (err, stats) => {
            if (err) {
                fs.writeFile('error-log.txt', '', (err) => {
                    if (err) throw err;
                });
            }
        });
        fs.appendFile('error-log.txt', '\n' + error + ' - ' + new Date().toString(), (err) => {
            if (err) throw err;
        });
    }
}());
