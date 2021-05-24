import stats from 'stats.js';
import * as d3 from 'd3';
import worldcup from './worldcup';
import Chance from 'chance';

const chance = new Chance(Math.random);

const div = document.createElement('div');
div.style =
  'width: 100px; height: 100px; position: fixed; top: 1px; right: 1px; color: white; background: red; z-index: 100000';
document.body.appendChild(div);

let globalStats = new stats();

globalStats.showPanel(0);

// create stats panel
const statsPanel = document.createElement('div');
statsPanel.id = 'stats-panel';
document.body.appendChild(statsPanel);
statsPanel.appendChild(globalStats.dom);

// create app panel
const appPanel = document.createElement('div');
appPanel.id = 'app';
document.body.appendChild(appPanel);

let last = Date.now();

const stating = () => {
  globalStats.begin();

  const now = Date.now();
  if (now - last > 20) {
    console.log(now - last);
  }

  last = Date.now();
  globalStats.end();
  requestAnimationFrame(stating);
};

stating();

const generateData = (nodeNum, edgeNum) => {
  const nodes = [],
    edges = [];
  for (let i = 0; i < nodeNum; i++) {
    nodes.push({
      id: `${i}`,
      label: `${i}`,
      x: chance.integer({ min: -20, max: 800 }),
      y: chance.integer({ min: -20, max: 800 }),
    });
  }
  for (let i = 0; i < edgeNum; i++) {
    edges.push({
      source: `${Math.floor(Math.random() * nodeNum)}`,
      target: `${Math.floor(Math.random() * nodeNum)}`,
    });
  }
  return { nodes, edges };
};

const canvasTest = () => {
  const canvas = d3
    .select('#app')
    .append('canvas')
    .attr('width', 800)
    .attr('height', 800);
  const context = canvas.node().getContext('2d');

  let data = {};
  const graphWidth = 800;
  const height = 800;
  fetch(
    'https://gw.alipayobjects.com/os/basement_prod/da5a1b47-37d6-44d7-8d10-f3e046dabf82.json',
  )
    .then((res) => res.json())
    .then((d) => {
      data = {
        nodes: d.nodes.map((e) => ({
          ...e,
          name: e.olabel,
        })),
        edges: d.edges.map((e, i) => ({
          ...e,
          id: i + 'e',
        })),
      };

      const simulation = d3
        //.forceSimulation()
        .nodes(data.nodes)
        .force('center', d3.forceCenter(graphWidth / 2, height / 2))
        .force('x', d3.forceX(graphWidth / 2).strength(0.1))
        .force('y', d3.forceY(height / 2).strength(0.1))
        .force('charge', d3.forceManyBody().strength(-50))
        .force(
          'link',
          d3
            .forceLink()
            .strength(1)
            .id(function (d) {
              return d.id;
            }),
        )
        .alphaTarget(0)
        .alphaDecay(0.05);

      simulation.on('tick', simulationUpdate);

      simulation.force('link').links(data.edges);

      canvas
        .call(
          d3
            .drag()
            .subject(dragsubject)
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended),
        )
        .call(
          d3
            .zoom()
            .scaleExtent([1 / 10, 8])
            .on('zoom', zoomed),
        );

      function zoomed(event) {
        console.log('zooming');
        transform = event.transform;
        simulationUpdate();
      }

      function dragsubject(event) {
        var i,
          x = transform.invertX(event.x),
          y = transform.invertY(event.y),
          dx,
          dy;
        for (i = data.nodes.length - 1; i >= 0; --i) {
          let node = data.nodes[i];
          dx = x - node.x;
          dy = y - node.y;

          if (dx * dx + dy * dy < radius * radius) {
            node.x = transform.applyX(node.x);
            node.y = transform.applyY(node.y);

            return node;
          }
        }
      }

      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = transform.invertX(event.x);
        event.subject.fy = transform.invertY(event.y);
      }

      function dragged(event) {
        event.subject.fx = transform.invertX(event.x);
        event.subject.fy = transform.invertY(event.y);
      }

      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
    });

  var transform = d3.zoomIdentity;

  const radius = 20;

  function simulationUpdate() {
    context.save();

    context.clearRect(0, 0, graphWidth, height);
    context.translate(transform.x, transform.y);
    context.scale(transform.k, transform.k);

    data.edges.forEach(function (d) {
      context.beginPath();
      context.moveTo(d.source.x, d.source.y);
      context.lineTo(d.target.x, d.target.y);
      context.stroke();
    });

    // Draw the nodes
    data.nodes.forEach(function (d, i) {
      context.beginPath();
      context.arc(d.x, d.y, radius, 0, 2 * Math.PI, true);
      context.fillStyle = d.col ? 'red' : 'black';
      context.fill();
    });

    context.restore();
  }
};

function draw(data) {
  let cache = null;
  let lines = null;
  function enableDragFunc(dragType) {
    return d3
      .drag()
      .on('start', function (event, d) {
        cache = event;

        if (dragType === 1) {
          d3.select(this).raise().attr('stroke', 'red');
        }
      })
      .on('drag', function (event, d) {
        const pX = event.x - cache.x;
        const pY = event.y - cache.y;

        cache = event;
        if (dragType === 1) {
          d.x = d.x + pX;
          d.y = d.y + pY;
          d3.select(this).attr('transform', (d) => {
            return 'translate(' + d.x + ',' + d.y + ')';
          });

          // 处理line
          lines
            .selectAll('.source-' + d.id)
            .attr('x1', (l) => d.x)
            .attr('y1', (l) => d.y);
          lines
            .selectAll('.target-' + d.id)
            .attr('x2', (l) => d.x)
            .attr('y2', (l) => d.y);
        } else {
          d3.select(this).attr('transform', (d) => {
            return 'translate(' + event.x + ',' + event.y + ')';
          });
        }
      })
      .on('end', function (event, d) {
        if (dragType === 1) {
          d3.select(this).attr('stroke', null);
        }
      });
  }

  let start = Date.now();
  const width = 800;
  const height = 800;
  // 绘图？
  const svg = d3
    .select('#app')
    .append('svg')
    .attr('viewBox', [0, 0, width, height])
    .attr('stroke-width', 2);

  svg.call(enableDragFunc(0));

  lines = svg.append('g');

  lines
    .selectAll('line')
    .data(data.edges)
    .enter()
    .append('line')
    .attr('x1', (d) => {
      return d.startPoint.x;
    })
    .attr('y1', (d) => d.startPoint.y)
    .attr('x2', (d) => d.endPoint.x)
    .attr('y2', (d) => d.endPoint.y)
    .attr('class', function (d, i) {
      return 'source-' + d.source + ' target-' + d.target;
    })
    .style('stroke', 'rgb(255,0,0)')
    .style('stroke-width', 2);

  let g;
  const zoom = d3.zoom().on('zoom', (e) => {
    svg.attr('transform', `scale(${e.transform.k})`);
  });

  svg.call(zoom).call(zoom.transform, d3.zoomIdentity);

  let transform;

  g = svg
    .selectAll('g')
    .data(data.nodes)
    .enter()
    .append('g')
    .call(enableDragFunc(1))
    .attr('transform', (d) => {
      return 'translate(' + d.x + ',' + d.y + ')';
    });
  g.append('circle')
    .attr('r', 10)
    .style('cursor', 'pointer')
    .attr('fill', (d, i) => d3.schemeCategory10[i % 10]);

  g.append('text')
    .attr('dx', 12)
    .attr('dy', '.35em')
    .text((d) => d.olabel)
    .attr('font-size', '11px')
    .attr('user-select', 'none');

  let d = Date.now() - start;

  div.innerHTML = '首次渲染: ' + d;
}

function test1() {
  fetch(
    'https://gw.alipayobjects.com/os/basement_prod/da5a1b47-37d6-44d7-8d10-f3e046dabf82.json',
  )
    .then((res) => res.json())
    .then((data) => {
      draw(data);
    });
}

function test2() {
  fetch(
    'https://gw.alipayobjects.com/os/bmw-prod/f0b6af53-7013-40ea-ae12-a24c89a0f960.json',
  )
    .then((res) => res.json())
    .then((data) => {
      data.edges.forEach((item, i) => {
        item.startPoint = data.nodes.find((e) => e.id === item.source);
        item.endPoint = data.nodes.find((e) => e.id === item.target);
      });
      draw(data);
    });
}

function test3() {
  const data = generateData(25000, 10000);
  data.edges.forEach((item, i) => {
    item.startPoint = data.nodes.find((e) => e.id === item.source);
    item.endPoint = data.nodes.find((e) => e.id === item.target);
  });
  draw(data);
}
function test4() {
  const data = generateData(50000, 20000);
  data.edges.forEach((item, i) => {
    item.startPoint = data.nodes.find((e) => e.id === item.source);
    item.endPoint = data.nodes.find((e) => e.id === item.target);
  });
  draw(data);
}

function test5() {
  const data = worldcup;
  data.nodes.forEach((item) => {
    item.olabel = item.label + item.title;
  });

  data.edges.forEach((item, i) => {
    item.startPoint = data.nodes.find((e) => e.id === item.source);
    item.endPoint = data.nodes.find((e) => e.id === item.target);
  });
  draw(data);
}

test5();
