import { io } from 'socket.io-client';

export default class Osc {
    constructor() {
		this.socket = io();
		
        this.marker_num    = document.getElementById('marker-num');
        this.change_marker = document.getElementById('change-marker');
        this.change_marker.addEventListener('click', () => {
            this.socket.emit('marker', {
                num: this.marker_num.innerText 
            });
        });

        this.osc_path = document.getElementById('osc-path');
        this.change_osc = document.getElementById('change-osc');
        this.change_osc.addEventListener('click', () => {
            this.socket.emit('video', {
                path: this.osc_path.innerText 
            });
        });
    }
};