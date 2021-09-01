const { Router } = require('express');
const router = Router();
const fs = require('fs');

router.get('/', async (req, res) => {
    res.send(req);
});

router.post('/', async (req, res) => {
    const data = req.files.video.data;
    const name = req.files.video.name;
    const path = "input" + "/" + name + ".mp4";
    try {
        fs.writeFile(path, data, () => {
            console.log('finished downloading video!');
            res.send(path);
        });
    } catch (err) {
        console.log(err);
    }
});

module.exports = router;