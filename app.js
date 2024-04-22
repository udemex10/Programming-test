const cors = require('cors');
const express = require('express');
const app = express();
const mysql = require('mysql2');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

app.use(cors());

// Setup MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'my_password', //removed mysql password for security reasons before pushing to github. Can be tested with same test table and differet mysql parameters.
  database: 'testdb'
});

connection.connect();

const width = 800; // Width of the canvas
const height = 400; // Height of the canvas
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

app.get('/', (req, res) => {
    res.send('Welcome to the Graph Viewer Server!');
  });

app.get('/graph/:traceId', async (req, res) => {
  const traceId = parseInt(req.params.traceId);
  console.log(`Received request for Trace ID: ${traceId}`);

  if (isNaN(traceId)) {
    return res.status(400).send('Invalid Trace ID');
  }

  try {
    const [results] = await connection.promise().query('SELECT trace_data FROM test WHERE trace_id = ?', [traceId]);
    if (results.length > 0) {
      const traceData = processBLOB(results[0].trace_data);
      const imageData = await drawGraph(traceData);
      res.type('png');
      res.send(imageData);
    } else {
      res.status(404).send('Trace not found');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

function processBLOB(blob) {
  let ints = [];
  for (let i = 0; i < blob.length; i += 4) {
    const buffer = Buffer.from(blob.slice(i, i + 4), 'binary');
    const intVal = buffer.readInt32BE(0);
    ints.push(intVal / 1000);
  }
  return ints;
}

async function drawGraph(data) {
  const configuration = {
    type: 'line',
    data: {
      labels: Array.from({ length: 601 }, (_, i) => i + 1),
      datasets: [{
        label: 'Trace Data',
        data: data,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    },
    options: {
      scales: {
        x: {
          title: {
            display: true,
            text: 'Point Index'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Value'
          }
        }
      }
    }
  };

  return chartJSNodeCanvas.renderToBuffer(configuration);
}

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
