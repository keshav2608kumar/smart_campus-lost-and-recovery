const axios = require('axios');

axios.post('http://localhost:8000/api/v1/lost-items', {
    title: 'test',
    description: 'test',
    category_id: 1,
    location_id: 1,
    lost_date: '2023-10-10',
    lost_time: '12:00:00'
}).then(r => console.log(r.data)).catch(e => console.error(e.response.data));
