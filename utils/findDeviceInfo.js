const useragent = require('useragent');

function findDeviceInfo(req) {
    // console.log("Agent before parsing:", req.headers['user-agent'])
    const agent = useragent.parse(req.headers['user-agent']);
    // console.log("Agent:", agent);
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let browser = agent.toAgent();
    // Check if the user-agent string contains specific identifiers for Edge
    const userAgentString = req.headers['user-agent'];
    if (userAgentString.includes('Edg/')) {
        browser = 'Edge';
    }
    const deviceInfo = {
        browser: browser,
        os: agent.os.toString(),
        device: agent.device.toString(),
        ip: ip
    }

    return deviceInfo;
}

module.exports = findDeviceInfo;