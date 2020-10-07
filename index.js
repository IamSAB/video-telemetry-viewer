const routeMap = [],
  dt = 0.2;

let currentIndex = 0,
  timeout,
  map,
  timelapse;

function playPause() {
  if (timelapse.paused)
    timelapse.play();
  else
    timelapse.pause();
}

function getDateSeconds(date) {
  return new Date(date).getTime() / 1000;
}

function syncMaptoTimelapse() {
  if (currentIndex * dt < timelapse.currentTime) {
    routeMap[currentIndex].setIcon(passedWaypointIcon)
    routeMap[currentIndex + 1].setIcon(currentWaypointIcon)
    currentIndex += 1
  }
  console.log(currentIndex)
}

function retrieveWaypoints(json) {
  const samples = json["1"].streams.GPS5.samples,
    startTime = getDateSeconds(samples[0].date),
    endTime = getDateSeconds(samples[samples.length - 1].date),
    scale = timelapse.duration / (endTime - startTime)

  waypoints = samples.map(s => {
    return {
      lat: s.value[0],
      lng: s.value[1],
      t: (getDateSeconds(s.date) - startTime) * scale
    }
  })
}

function loadMap() {
  map = new L.Map("map", {
    crs: L.CRS.EPSG3857,
    continuousWorld: true,
    worldCopyJump: false
  });
  map.addLayer(new L.tileLayer("https://wmts20.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg"));
  map.setView(L.latLng(waypoints[0].lat, waypoints[0].lng), 15)
}

function interpolate(tx, t1, t2, c1, c2) {
  return c1 + (tx - t1) * (c2 - c1) / (t2 - t1)
}

function jumpTo(index) {
  const it = index < currentIndex ? [index, currentIndex] : [currentIndex, index],
    icon = index < currentIndex ? aheadWaypointIcon : passedWaypointIcon;

  console.log(it)
  for (i = it[0]; i <= it[1]; i++) {
    routeMap[i].setIcon(icon)
  }
  routeMap[index].setIcon(currentWaypointIcon)
  timelapse.currentTime = index*dt
  currentIndex = index
  console.log(`jumped to from i = ${index} to ${currentIndex} / t = ${index*dt}s to ${currentIndex*dt}s`)
}

const startIcon = L.divIcon({ className: 'icon start-icon', html: "START" }),
  endIcon = L.divIcon({ className: 'icon end-icon', html: "END" }),
  passedWaypointIcon = L.divIcon({ className: "icon passed-waypoint-icon", html: "o" }),
  aheadWaypointIcon = L.divIcon({ className: "icon ahead-waypoint-icon", html: "o" }),
  currentWaypointIcon = L.divIcon({ className: "icon last-waypoint-icon", html: "x" })

function createRouteMap() {
  let j = 0, lat, lng;
  for (i = 0; i <= Math.floor(timelapse.duration / dt); i++) {
    console.log(i)
    p1 = waypoints[j]
    p2 = waypoints[j + 1]
    console.log(`t1: ${p1.t} ti: ${i*dt} t2: ${p2.t}`)
    if (i * dt > p2.t) {
      for (;waypoints[j + 1].t <= i*dt; j++);
      p1 = waypoints[j]
      p2 = waypoints[j + 1]
    }
    lat = interpolate(i * dt, p1.t, p2.t, p1.lat, p2.lat)
    lng = interpolate(i * dt, p1.t, p2.t, p1.lng, p2.lng)
    routeMap.push(L.marker([lat, lng], {
      icon: aheadWaypointIcon,
      index: i
    }).on("click", (e) => {
      jumpTo(e.target.options.index)
    }).addTo(map))
  }
}

function setupSync() {
  let interval;
  timelapse.onplay = function () {
    interval = setInterval(syncMaptoTimelapse, dt*100)
  };
  function stopSync() {
    clearInterval(interval)
  }
  timelapse.onpause = stopSync
  timelapse.waiting = stopSync
  timelapse.onended = stopSync
}

function run() {
  routeMap[0].setIcon(startIcon)
  routeMap[routeMap.length - 1].setIcon(endIcon)
  // map.setView(routeMap[0]._latlng)
  timelapse.play()
}

$(function () {
  console.log("onmetadata")
  $.getJSON("data.json", function (json) {
    timelapse = document.getElementById("timelapse");
    retrieveWaypoints(json)
    loadMap()
    createRouteMap()
    setupSync()
    run()
  })
});


