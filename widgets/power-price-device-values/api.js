'use strict';

async function getDevice({ homey, deviceId }) {
    if (!homey) {
        throw new Error('Missing Homey');
    }

    if (!deviceId) {
        throw new Error('Missing Device deviceId');
    }

    const driver = await homey.drivers.getDriver('kwh-meter');
    const PPDevice = driver.getDevices().find((device) => device.getData().id === deviceId);
    if (!PPDevice) {
        throw new Error('Power Price device Not Found');
    }

    return PPDevice;
}

module.exports = {
    async getDeviceCapabilities({ homey, query }) {
        const { deviceId } = query;
        const device = await getDevice({ homey, deviceId });
        const deviceSettings = device.getSettings();
        const i18n = homey.i18n.getLanguage();
        const date = new Date();
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        };
        const dateResult = new Intl.DateTimeFormat(i18n, options).format(date);

        const unit = deviceSettings.monetary_unit;
        let currencyUnit = 'EUR';

        if (unit.includes('.')) {
            currencyUnit = unit.split('.')[1];
        }
        const formattedCosts = device.getCapabilityValue('measure_monetary').toLocaleString(i18n, { style: 'currency', currency: currencyUnit });

        return {
            lastUpdate: dateResult,
            name: device.getName(),
            usage: device.getCapabilityValue('meter_power').toFixed(2),
            duration: device.getCapabilityValue('measure_duration'),
            costs: formattedCosts,
            isRunning: device.getCapabilityValue('alarm_running')
        };
    },

    async getDevices({ homey, body }) {
        if (!homey) {
            throw new Error('Missing Homey');
        }
        return await homey.drivers.getDriver('kwh-meter').getDevices();
    }
};
