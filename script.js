
// =====================================
// POWERGUARD SYSTEM STATE
// =====================================

const state = {
    gridOn: true,
    battery: 82,
    sunlight: 65,
    shed: false,
    usbOff: false,
    lastTick: Date.now()
};

const $ = id => document.getElementById(id);

const loads = {
    lights: 6,
    usb: 10,
    fan: 5
};

// Battery thresholds
const FAN_OFF_THRESHOLD = 20;
const FAN_ON_THRESHOLD = 25;

const USB_OFF_THRESHOLD = 10;
const USB_ON_THRESHOLD = 15;

// =====================================
// POWER CONSUMPTION
// =====================================

function activeWatts() {
    return (state.shed ? loads.lights + loads.usb : loads.lights + loads.usb + loads.fan)
        - (state.usbOff ? loads.usb : 0);
}

// =====================================
// AUTOMATIC LOAD MANAGEMENT
// =====================================

function manageLoads() {

    // When grid is available, all loads remain ON
    if (state.gridOn) {
        state.shed = false;
        state.usbOff = false;
        return;
    }

    // Battery below 20%: switch OFF the fan
    if (state.battery < FAN_OFF_THRESHOLD) {
        state.shed = true;
    }

    // Battery reaches 25%: restore the fan
    else if (state.battery >= FAN_ON_THRESHOLD) {
        state.shed = false;
    }

    // Battery below 10%: switch OFF USB charging
    if (state.battery < USB_OFF_THRESHOLD) {
        state.usbOff = true;
    }

    // Battery reaches 15%: restore USB charging
    else if (state.battery >= USB_ON_THRESHOLD) {
        state.usbOff = false;
    }
}

// =====================================
// UPDATE DASHBOARD
// =====================================

function render() {

    const battery = Math.round(state.battery);
    const watts = activeWatts();
    const solar = Math.round(state.sunlight);

    const voltage = (11.8 + battery * 0.012).toFixed(1);

    const availableWh = battery / 100 * 170;
    const runtime = watts ? availableWh / watts : 0;

    $('batteryPct').textContent = `${battery}%`;
    $('batteryMeter').style.width = `${battery}%`;
    $('batteryBig').innerHTML = `${battery}<span>%</span>`;
    $('batteryFill').style.width = `${battery}%`;
    $('batterySlider').value = battery;
    $('batterySliderValue').textContent = `${battery}%`;
    $('voltage').textContent = `${voltage} V`;

    $('batteryHint').textContent =
        `${battery > 40 ? 'Healthy' :
        battery >= 20 ? 'Low charge' :
        'Critical level'} · ${voltage} V`;

    $('totalWatts').textContent = watts;

    $('runtime').innerHTML =
        `${runtime.toFixed(1)}<em> h</em>`;

    $('runtimeMeter').style.width =
        `${Math.min(100, runtime / 10.6 * 100)}%`;

    $('solarWatts').textContent = solar;

    $('solarHint').textContent =
        solar > 5 ? 'Solar input available' : 'No solar generation';

    $('sunValue').textContent = `${solar}%`;
    $('sunSlider').value = solar;

    document.querySelector('.solar-line span')
        .style.width = `${solar}%`;

    // Operating mode
    $('heroMode').textContent =
        state.gridOn
        ? 'GRID NORMAL'
        : (state.shed || state.usbOff
            ? 'ENERGY SAVING MODE'
            : 'BATTERY BACKUP');

    $('heroSub').textContent =
        state.gridOn
        ? 'Grid supply available'
        : state.usbOff
            ? 'Fan and USB charging switched OFF'
            : state.shed
                ? 'Fan switched OFF to save energy'
                : 'Running from battery';

    $('heroIcon').textContent = state.gridOn ? '⚡' : '▰';

    $('connectionLabel').textContent =
        state.gridOn ? 'SYSTEM ONLINE' : 'BACKUP ACTIVE';

    // Grid status
    $('gridPill').textContent =
        state.gridOn ? 'GRID CONNECTED' : 'GRID DISCONNECTED';

    $('gridPill').style.background =
        state.gridOn ? '#edf3ff' : '#fff3e8';

    $('gridPill').style.color =
        state.gridOn ? '#2864e8' : '#c47a1a';

    $('gridTitle').textContent =
        state.gridOn
        ? 'Grid supply is active'
        : 'Grid supply is unavailable';

    $('gridDescription').textContent =
        state.gridOn
        ? 'Loads are supplied by the grid.'
        : 'PowerGuard is running on battery backup.';

    $('gridToggle').innerHTML =
        state.gridOn
        ? 'Simulate power cut <span>→</span>'
        : 'Restore grid supply <span>↗</span>';

    // Battery warning
    $('batteryNote').innerHTML =
        state.usbOff
        ? '<span>!</span> Battery below 10%. Fan and USB charging are OFF. LED lights remain ON.'
        : state.shed
            ? '<span>!</span> Battery below 20%. Fan is OFF. LED lights and USB charging remain ON.'
            : !state.gridOn && battery < 15
                ? '<span>!</span> Battery recovering. USB charging will turn ON at 15%.'
                : !state.gridOn && battery < 25
                    ? '<span>!</span> Battery recovering. Fan will turn ON at 25%.'
                    : '<span>✓</span> Battery level is within the normal operating range.';

    // Connected loads
    updateLoad('light', true);
    updateLoad('usb', !state.usbOff);
    updateLoad('fan', !state.shed);
}

// =====================================
// UPDATE LOAD STATUS
// =====================================

function updateLoad(name, on) {

    const card = $(`${name}Card`);

    $(`${name}State`).textContent = on ? 'ON' : 'OFF';

    card.classList.toggle('is-off', !on);
}

// =====================================
// GRID OUTAGE SIMULATION
// =====================================

$('gridToggle').addEventListener('click', () => {

    state.gridOn = !state.gridOn;

    manageLoads();
    render();
});

// =====================================
// SOLAR SUNLIGHT ADJUSTMENT
// =====================================

$('sunSlider').addEventListener('input', event => {

    state.sunlight = Number(event.target.value);

    render();
});

// =====================================
// MANUAL BATTERY LEVEL ADJUSTMENT
// =====================================

$('batterySlider').addEventListener('input', event => {

    state.battery = Number(event.target.value);

    manageLoads();
    render();
});

// =====================================
// AUTOMATIC BATTERY SIMULATION
// =====================================


function tick() {

    const now = Date.now();

    const elapsedMinutes =
        Math.min((now - state.lastTick) / 60000, 1);

    state.lastTick = now;

    // Battery consumption during grid outage
    if (!state.gridOn) {

        const drainRate = activeWatts() / 170 * 100;

        state.battery = Math.max(
            5,
            state.battery - elapsedMinutes * drainRate
        );
    }

    // Solar charging works whenever sunlight is available
    if (state.sunlight > 0) {

        const solarChargeRate =
            (state.sunlight / 100) * 5;

        state.battery = Math.min(
            100,
            state.battery + elapsedMinutes * solarChargeRate
        );
    }

    manageLoads();
    render();
}


// =====================================
// START POWERGUARD
// =====================================

manageLoads();
render();

setInterval(tick, 1000);
