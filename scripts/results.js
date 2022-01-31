const toa_key = '489120257d4eb4ab9984c8431ad686ad141584f0ee0585facd19876b6bdea391';
const application_origin = 'TOA-WebApp-1819'
const standard_headers = {
    'Content-Type': 'application/json',
    // 'X-TOA-Key': toa_key,
    'Host': 'theorangealliance.org',
    'Referer': 'https://theorangealliance.org/home',
    'X-Application-Origin': application_origin,
};

function wait(delay){
    return new Promise((resolve) => setTimeout(resolve, delay));
}

async function fetch_retry(url, options, n) {
    return fetch(url, options).then((response) => {
        if (! response.ok) {
            throw new Error();
        }

        return response;
    }).catch(e => {
        console.warn("couldn't fetch " + url + ": " + e + ": trying at depth " + n);

        if (n == 0) { throw e; }
        // Stagger the requests.
        return wait(60000).then(() => fetch_retry(url, options, n-1));
    });
}

async function populate_results() {
    Promise.all([
        // Get every win and lose
        get_wal('19922'),
        get_wal('16748'),

        // Get every award
        get_awards('19922'),
        get_awards('16748'),

        (async () => {
            let jv = await get_points('19922');
            console.log(jv);

            let v = await get_points('16748');
            console.log(v);
            
            points_chart('point-history', jv, v);
        })(),
    ]).then(values => {
        $("#loading").hide();
        $("#content").fadeIn(500);
    });
}

async function calc_and_show_points_chart() {
    let jv = await get_points('19922');
    let v = await get_points('16748');

    console.log(jv);
    console.log(v);
    points_chart('point-history', jv, v);
}

async function get_wal(team) {
    fetch_retry('https://theorangealliance.org/api/team/' + team + '/wlt', {
        method: 'GET',
        headers: standard_headers,
    }, 10).catch(s => t()).then(response => response.json()).then(data => {
        win_loss_pie(team + 'wins', data[0]['wins'], data[0]['ties'], data[0]['wins']+data[0]['losses']);
    });
}

async function get_awards(team) {
    fetch_retry('https://theorangealliance.org/api/team/' + team + '/awards/2122', {
        method: 'GET',
        headers: standard_headers,
    }, 10).catch(s => t()).then(response => response.json()).then(data => {
        let so_far = [];

        for (const award of data) {
            so_far.push(award.award_name);
        }

        awards(team + 'awards', so_far)
    });
}

async function get_points(team) {
    let points = [];

    await fetch_retry('https://theorangealliance.org/api/team/' + team + '/events/2122', {
        method: 'GET',
        headers: standard_headers,
    }, 10).catch(s => t()).then(response => response.json()).then(async events => {
        let every_related_match = [];
        let team_matches = [];
        let team_matches_with_meta = [];

        for (const event of events) {
            let event_key = event['event_key'];

            const considered_matches = await fetch_retry('https://theorangealliance.org/api/event/' + event_key + '/matches', {
                method: 'GET',
                headers: standard_headers,
            }, 10).catch(s => t()).then(response => response.json()).then(considered_matches => { return considered_matches; });

            for (const considered_match of considered_matches) {
                every_related_match.push({match: considered_match['match_key'], event: considered_match['event_key']});
            }
        }

        console.log('every_related_match');
        console.log(JSON.parse(JSON.stringify(every_related_match)));

        const matches = await fetch_retry('https://theorangealliance.org/api/team/' + team + '/matches/2122', {
            method: 'GET',
            headers: standard_headers,
        }, 10).catch(s => t()).then(response => response.json()).then(matches => { return matches; });

        for (const match of matches) {
            team_matches.push(match['match_key']);
        }

        console.log('team_matches');
        console.log(JSON.parse(JSON.stringify(team_matches)));

        for (const related_match of every_related_match) {
            for (const team_match of team_matches) {
                if (related_match['match'] == team_match) {
                    team_matches_with_meta.push(related_match);
                    break;
                }
            }
        }

        console.log('team_matches_with_meta');
        console.log(JSON.parse(JSON.stringify(team_matches_with_meta)));

        let x = [];

        for (const match of team_matches_with_meta) {
            const data = await fetch_retry('https://theorangealliance.org/api/match/' + match['match'], {
                method: 'GET',
                headers: standard_headers,
            }, 10).catch(s => t()).then(response => response.json()).then(data => data);

            let us;
            let side;

            console.log('data');
            console.log(JSON.parse(JSON.stringify(data)));

            for (const participant of data[0]['participants']) {
                if (participant['team_key'] == team) {
                    // console.log(participant);
                    us = participant;
                    break;
                }
            }

            if (us['station'] == 11 || us['station'] == 12) {
                side = 'red';
            } else {
                side = 'blue';
            }

            // x[data[0][side + "_end_score"]] = Date.parse(data[0]['match_start_time']);
            x[Date.parse(data[0]['match_start_time'])] = data[0][side + "_end_score"];

            // x.push({data[0][side + "_end_score"] : data[0]['match_start_time']});
        }

        console.log('x:');
        console.log(x);

        let keys = Object.keys(x)
        keys.sort();

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = x[key];

            if (value < 0) {
                value = 0;
            }

            points.push(value);
        }

        /* console.log('keys:');
        console.log(keys); */
    });

    console.log('points');
    console.log(JSON.parse(JSON.stringify(points)));

    return points;
}

function win_loss_pie(pie, wins, ties, total) {
    const ctx = document.getElementById(pie).getContext('2d');
    const loss_chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Wins', 'Ties', 'Losses'],
            datasets: [{
                data: [wins, ties, total-(wins+ties)],
                backgroundColor: [
                    'rgba(45, 104, 63, 1)',
                    'rgba(177, 54, 34, 1)',
                    'rgba(54, 58, 64, 1)',
                ]
            }]
        },
        options: {
            plugins:{
                legend: {
                    display: false
                },
                tooltips: {
                    enabled: false
                }
            },
        },
    });
}

function points_chart(chart, jv, v) {
    let labels = [];
    let l;

    if (jv.length > v.length) {
        l = jv.length;
    } else {
        l = v.length;
    }

    for (let i = 0; i < l; i++) {
        labels.push('Event ' + i);
    }

    const ctx = document.getElementById(chart).getContext('2d');
    const points_chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Junior Varsity (Exact)',
                data: jv,
                fill: false,
                borderColor: 'rgb(204, 47, 47, 0.5)',
                pointRadius: 0,
                borderWidth: 1,
            }, {
                label: 'Varsity (Exact)',
                data: v,
                fill: false,
                borderColor: 'rgb(44, 175, 201, 0.5)',
                pointRadius: 0,
                borderWidth: 1,
            }, {
                label: 'Junior Varsity (Trend)',
                data: [],
                fill: false,
                borderColor: 'rgb(204, 47, 47, 1)',
                pointRadius: 0,
            }, {
                label: 'Varsity (Trend)',
                data: [],
                fill: false,
                borderColor: 'rgb(44, 175, 201, 1)',
                pointRadius: 0,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                filler: {
                    propagate: false,
                },
                title: {
                    display: true,
                    text: 'Point History'
                }
            },
            element: {
                point: {
                    pointRadius: 0,
                },
            },
            scales: {
                x: {
                    title: {
                        text: "Events"
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        text: "Points"
                    },
                    grid: {
                        display: false
                    }
                }
            },
            interaction: {
                intersect: false,
            }
        },
    });

    {
        arrayForRegression= []; // Declare the array which will contains calculated point of trend line
        
        for (i = 0; i < points_chart.data.datasets[0].data.length; i++) {
            arrayForRegression.push([i, points_chart.data.datasets[0].data[i]]); // Fill the array with the "y" values to be approximated by regression
        }

        regr = regression("linearthroughorigin", arrayForRegression, 2); // Calculare polynomial regression
        convertedRegressionArray = []; // Declare an array to hold  the regression line in charts.js format
        
        for (i = 0; i < points_chart.data.datasets[0].data.length; i++) { // Fill the array with calculated values
            convertedRegressionArray.push(regr.points[i][1]);
        }
        
        points_chart.config.data.datasets[2].data = convertedRegressionArray; // Put the regression array, converted to charts format, into chart
        points_chart.update();
    }

    {
        arrayForRegression= []; // Declare the array which will contains calculated point of trend line
        
        for (i=0; i < points_chart.data.datasets[1].data.length; i++) {
            arrayForRegression.push([i, points_chart.data.datasets[1].data[i]]); // Fill the array with the "y" values to be approximated by regression
        }
        
        regr = regression("linearthroughorigin", arrayForRegression, 2); // Calculare polynomial regression
        convertedRegressionArray = []; // Declare an array to hold  the regression line in charts.js format
        
        for (i=0; i < points_chart.data.datasets[1].data.length; i++) { // Fill the array with calculated values
            convertedRegressionArray.push(regr.points[i][1]);
        }
        
        points_chart.config.data.datasets[3].data = convertedRegressionArray; // Put the regression array, converted to charts format, into chart
        points_chart.update();
    }
}

function awards(list, awards) {
    for (const award of awards) {
        $('#' + list).html($('#' + list).html() + '<p>' + award + '</p>\n')
    }
}

function t() {
    $('#internal-error').show();
    $('#results').hide();
}
