window.addEventListener('load', (event) => {
    const modalButton  = document.getElementById('text-modal-button');
    // modalButton.click();
});

mapboxgl.accessToken = 'pk.eyJ1IjoibWFrb2JvdXp1IiwiYSI6ImNrYWF5and0MzFhYnMyc214ZGo3OWd3cHQifQ.pPCfwEss5pJhm4Yu7kvj1w';
var center = [139.5798591, 35.703521];
var zoom = 15;

const url = new URL(location);
var urlParam = location.search.substring(1);
if(urlParam){
    center[0] = url.searchParams.get("lng");
    center[1] = url.searchParams.get("lat");
}

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: center,
    zoom: zoom
});

var lang = navigator.language;
if(lang === 'ja'){
    var geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        language: 'ja',
        placeholder: '録音した場所を検索',
        marker: {
            color: '#727475'
        },
        mapboxgl: mapboxgl
    });
}else{
    var geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        language: 'en',
        placeholder: 'Recorded at.',
        marker: {
            color: '#727475'
        },
        mapboxgl: mapboxgl
    });
}

map.addControl(geocoder);
map.addControl(new mapboxgl.NavigationControl());
var geocoder_lng, geocoder_lat;
geocoder.on('result', function(e) {
    geocoder_lng = e.result.center[0];
    geocoder_lat = e.result.center[1];
    console.log("lng : " + geocoder_lng + " : lat : " + geocoder_lat);
});

// Database reflect
let markers = [];
map.on('load', () => { 
    axios.get('/db')
    .then(response => {
        const db_response = response.data;
        var   num         = 0;
        db_response.map(value => {
            var marker = new mapboxgl.Marker({ "color": "#222529" })
                .setLngLat([value.location.x, value.location.y])
                .addTo(map);
                marker._element.id = "marker_" + num;
                num +=1;
            markers.push(marker);
        });

        for(var i = 0; i < markers.length; ++i){
            const marker_lnglat = markers[i]._lngLat;
            const marker_num    = markers[i].getElement().id.split('_')[1];
            const num           = document.getElementById('marker-num');
            const change_marker = document.getElementById('change-marker');
            markers[i].getElement().addEventListener('click', () => {
                // set URL param
                var queryParams = new URLSearchParams(window.location.search);
                queryParams.set("lng", marker_lnglat.lng);
                queryParams.set("lat", marker_lnglat.lat);
                history.replaceState(null, null, "?"+queryParams.toString());

                const video_modal_button = document.getElementById('video-modal-button');
                const markerVideo = document.getElementById('marker-video');
                console.log(db_response[marker_num].video_path);
                markerVideo.muted = false;

                // markerVideo.src   = "https://www.youtube.com/embed/VqjLk8wzLv0?modestbranding=1?autoplay=1"; //iframe tag
                markerVideo.src = db_response[marker_num].video_path; //video tag
                video_modal_button.click();

                num.innerHTML = marker_num;
                change_marker.click();

            });
        }
    })
    .catch(err => {
        console.log(err);
    });
});

// When modal close, Mute & Remove video
$("#modal").on("hide.bs.modal", function () {
    const marker_video = document.getElementById("marker-video");
    marker_video.muted = true;
});

function fileUploader(){
    const osc_path = document.getElementById('osc-path');
    const change_osc = document.getElementById('change-osc');
    const file = document.getElementById('file-input');
    const name = new Date().getTime().toString(16);
    const file_value = new File([file.files[0]], name.valueOf(),{ type:"video/mp4" });

    const dbData = new FormData();
    dbData.append("video", file_value);
    const dbHead = {
        method: 'post',
        data: dbData,
        'Content-Type': 'multipart/form-data'
    };
    axios.post("/upload", dbData, {
        header: dbHead
    })
    .then(function (response) {
        console.log(response);
        osc_path.innerHTML = response.data;
        change_osc.click();
    })
    .catch(function (error) {
        console.log(error);
    });

}