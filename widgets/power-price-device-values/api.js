'use strict';

async function getDevice({ homey, deviceId, driverId }) {
    if (!homey) {
        throw new Error('Missing Homey');
    }

    if (!deviceId) {
        throw new Error('Missing Device deviceId');
    }

    const driver = await homey.drivers.getDriver(driverId);
    const selectedDevice = driver.getDevices().find((device) => device.getData().id === deviceId);

    if (!selectedDevice) {
        throw new Error('[Widget API] [getDevice] Power Price device Not Found');
    }

    return selectedDevice;
}

async function getUnit({ usageCapability }) {
    const unitMap = {
        meter_gas: 'm3',
        'meter_gas.imperial': 'ft3',
        'measure_content_volume.gj': 'GJ',
        meter_power: 'kWh',
        measure_content_volume: 'L',
        'measure_content_volume.imperial': 'gal',
        meter_water: 'm3',
        'meter_water.imperial': 'ft3',
        measure_power: 'W',
        measure_weight: 'kg',
        'measure_weight.imperial': 'oz'
    };
    return unitMap[usageCapability] || '';
}

async function getUsageCapability({ device }) {
    const arrayToFilter = ['measure_monetary', 'measure_duration', 'measure_duration_seconds', 'alarm_running'];
    let deviceCapabilities = device.getCapabilities();
    let getusageCapability = deviceCapabilities.find((d) => !arrayToFilter.some((atf) => d.startsWith(atf)));

    // console.log('[capabilityOptions]:', deviceCapabilities, getusageCapability);

    return getusageCapability;
}

async function getUsageCapabilityValue({ device, usageCapability, i18nLang, deviceSettings }) {
    const usageValue = await device.getCapabilityValue(usageCapability);

    const formattedValue = new Intl.NumberFormat(i18nLang, { maximumFractionDigits: deviceSettings.usage_decimals }).format(usageValue);

    // console.log('[getUsageCapabilityValue]:', usageValue, deviceSettings.usage_decimals, formattedValue);

    return formattedValue;
}

async function getFormattedMonetaryValue({ device, deviceSettings, i18nLang }) {
    const unit = deviceSettings.monetary_unit;
    let currencyUnit = 'EUR';

    if (unit.includes('.')) {
        currencyUnit = unit.split('.')[1];
    }
    return device.getCapabilityValue('measure_monetary').toLocaleString(i18nLang, { style: 'currency', currency: currencyUnit, maximumFractionDigits: deviceSettings.costs_decimals });
}

async function getTimestamp({ homey, i18nLang, device }) {
    const store = await device.getStoreValue('support-values');
    const timezone = await homey.clock.getTimezone();

    // console.log('[Widget API] - [getTimestamp] - ', { store });

    const date = store?.lastDurationEndTime ? new Date(store.lastDurationEndTime) : new Date();
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: 'numeric',
        minute: 'numeric',
        timeZone: timezone
    };

    return new Intl.DateTimeFormat(i18nLang, options).format(date);
}

module.exports = {
    async getDeviceCapabilities({ homey, query }) {
        // console.log('[getDeviceCapabilities] - ', query);
        const { deviceId, driverId } = query;
        const device = await getDevice({ homey, deviceId, driverId });
        const deviceSettings = device.getSettings();
        const i18nLang = homey.i18n.getLanguage();

        const timestamp = await getTimestamp({ homey, i18nLang, device });
        const formattedCosts = await getFormattedMonetaryValue({ device, deviceSettings, i18nLang });
        const usageCapability = await getUsageCapability({ device });
        const usage = await getUsageCapabilityValue({ device, usageCapability, i18nLang, deviceSettings });
        const unit = await getUnit({ usageCapability });

        const driverIcon = device.driver.manifest.icon;

        return {
            driverId,
            icon: driverIcon,
            lastUpdate: timestamp,
            name: device.getName(),
            unit,
            results: {
                usage,
                duration: device.getCapabilityValue('measure_duration'),
                costs: formattedCosts
            },
            isRunning: device.getCapabilityValue('alarm_running')
        };
    }
};
