(function(){
	const ltc = {};
		ltc.map;
		ltc.meetups = [];
		ltc.markers = {};

	// get week range for meetups
	let currentWeek = getWeekRange();
	let today = new Date;
	console.log(currentWeek);
	let firstDow = today.getDate()-currentWeek[1].date + 1;
	let lastDow = currentWeek[14].date-today.getDate();
	const api = {};
		api.group = 'LearnTeachCode';
		// api.perPage = 15; &page=' + api.perPage + 
		api.offset = 0;
		api.path = 'https://api.meetup.com/2/events?&sign=true&photo-host=public';
		api.startWeekDate = '-' + firstDow + 'd';
		api.endWeekDate = lastDow + 'd';
		api.status = 'upcoming,past';
		api.url = api.path + '&group_urlname=' + api.group + '&status=' + api.status + '&time=' + api.startWeekDate + ',' + api.endWeekDate;
		api.err = "Error occurred processing Meetup API URL";

	// Get Meetup Data
	function getData(url, successFunc, errMsg) {
		$.ajax({
			type: "GET",
			url: url,
			success: successFunc,
			error: function(){ console.log( errMsg ); },
			dataType: 'jsonp'
		});
	}

	function processData(data) {
		let utctime = new Date(data.results[0].time);
		console.log(utctime.toUTCString());

		data.results.forEach( function( meetup, index ) {
			// Get event formatted dates and time
			data.results[index].d = getDateFormats( meetup );
		});
		// Append new meetups
		ltc.meetups.push(...data.results);
		// List new meetups
		listMeetups(data);
		mapMeetups(data);
		listMeetupsinWeekView(data);
	}

	function mapMeetups(data){
		let currentMarkers = [];
		if(data.meta.count){
			drawMap();
			data.results.forEach( meetup => {
				// console.log('venue',meetup.venue.name,meetup.venue.id);
				if( Math.abs(meetup.venue.lat) && Math.abs(meetup.venue.lon) ) {
					let meeting = '<li>'+meetup.d.month+' '+meetup.d.d+': <a href="#meetup-'+meetup.id+'" title="'+meetup.name+'">'+meetup.name+'</a></li>';
					meetup.popup = { meetings: [] };
					if( ltc.markers[meetup.venue.id] ) {
						meetup.marker = ltc.markers[meetup.venue.id];
						// console.log('venue exists!', meetup.venue.name, meetup, meetup.popup);
						
						meetup.popup.meetings.push( meeting );
						//let content = meetup.popup.getContent();
						let newContent = meetup.marker.getPopup().getContent().split("</ul>")[0] + meeting + "</ul>";
						meetup.marker.setPopupContent( newContent );
						//console.log( meetup.marker.getPopup().getContent().split("</ul>")[0] + meeting + "</ul>" );
					} else {
						meetup.popup.title = '<strong>' + meetup.venue.name + '</strong>';
						meetup.popup.location = '<br><small>' + meetup.venue.address_1 +', ';
						meetup.popup.location += meetup.venue.city +', '+ meetup.venue.state.toUpperCase();
						meetup.popup.location += ( (meetup.venue.zip)? ', '+meetup.venue.zip : '' )+'</small>';
						meetup.popup.meetings.push( meeting );
						meetup.popup.content = meetup.popup.title + meetup.popup.location;
						meetup.popup.content += "<ul>";
						meetup.popup.meetings.forEach( meeting => {
							meetup.popup.content += meeting;
						});
						meetup.popup.content += "</ul>";
						// console.log(meetup.popup.meetings);

						// let popup = '<a href="'+meetup.event_url+'" title="'+meetup.name+'">'+meetup.name+'</a>';
						meetup.marker = L.marker([meetup.venue.lat, meetup.venue.lon]).bindPopup( meetup.popup.content ).addTo(ltc.map);
						ltc.markers[meetup.venue.id] = meetup.marker;
						currentMarkers.push( meetup.marker );
					}

				}
			});

			if( currentMarkers.length > 0 ) {
				let group = new L.featureGroup( currentMarkers );
				ltc.map.fitBounds( group.getBounds() );
			}
		}
	}

	function drawMap() {
		// If a map has not been created
		if( !ltc.map ) {
			// Add height to map div via active class
			document.getElementById('mapid').classList.add('active');

			// Map Center Coordinates
			let latlng = [ 34.0522, -118.2437 ];  // Los Angeles
			let zoomlevel = 13;                   // Greater LA Metro Zoom view

			// Initialize Map and assign to ltc.map
			ltc.map = L.map('mapid').setView( latlng, zoomlevel );
		
			// Use Open Street Map default (Mapnik)
			// L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			// 	maxZoom: 20,
			//     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			// }).addTo(ltc.map);
			
			//// CARTO BASE MAPS - FREE TO USE ////
			//// Max use 75,000 map impressions a Month per CartoDB, Inc.
			//// MAP STYLE: Voyager
			// L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
			//// MAP STYLE: Voyager Labels Under
			L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
				subdomains: 'abcd',
				maxZoom: 20
			}).addTo(ltc.map);
		}
	}

	// Display Meetup Data
	function listMeetups(data){
		// List Items
		let list = '';

		// Check count of upcoming events
		if(data.meta.count){
			// Get formatted meetups list items
			list = getFormattedMeetups(data.results).join('');
			// If more items are available add a note
			if(data.meta.total_count > data.meta.count && data.meta.count >= api.perPage){
				list += '<li class="load-more"><a href="https://www.meetup.com/LearnTeachCode/events/">Load More</a></li>';
			}
		}else{
			// No upcoming events note
			list += '<li>No Meetups Currently Scheduled. Stay tuned.</li>';
		}

		// Remove load-more button just before adding new elements, which may include new load-more button
		$('.load-more').remove();

		// Add the list to the element
		$(".meetups").append(list);
	}

	// Display Meetup Data in Week View
	function listMeetupsinWeekView(data) {

		let week = getWeekRange();
		
		let unfilteredMeetups = data.results;
		let currentDay = new Date();
		let maxDay = new Date(currentDay.getDate()+5);
		let maxTime = maxDay.getTime(); //compare by utc time

		let filteredMeetups = unfilteredMeetups.filter((meetup) => meetup.time >= maxTime);

		let meetupsByDay = getWeekFormattedMeetups(filteredMeetups);

		for(let i=1; i <= 7; i++) {
			let week1div = '<div class="day" id="' + week[i].dow.toLowerCase() + week[i].date + '"></div>';
			document.querySelector('#firstweek').insertAdjacentHTML('beforeend', week1div);
		}

		for(let i=8; i <= 14; i++) {
			let week2div = '<div class="day" id="' + week[i].dow.toLowerCase() + week[i].date + '"></div>';
			document.querySelector('#secondweek').insertAdjacentHTML('beforeend', week2div);
		}

		for(let i=1; i < week.length; i++) {
			let weekday = week[i];
			let dowDay = weekday.dow.substring(0,3) + weekday.date;
			let teststring = meetupsByDay[dowDay];
			let formattedWeek = '<div class="weekday">'
				+ weekday.dow.substring(0,3) + ' ' 
				+ weekday.month.substring(0,3) + ' ' 
				+ weekday.date
				+ '</div>';
			if(teststring) {
				formattedWeek += teststring.join('');		
			} else {
				formattedWeek += '<div class="week-meetup">No meetups!</div';
			}			
			$('#' + weekday.dow.toLowerCase() + weekday.date).append(formattedWeek);
		}
	}

	// Get Week Range
	function getWeekRange() {
		let d = new Date; //get current date
		let first = d.getDate() - d.getDay();
		let firstday = (new Date(d.setDate(first - 1))).toUTCString();
		let week = [firstday];
		const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

		for(let i=0; i<14; i++) {
			let next = new Date(d.getTime());
			next.setDate(first+i);
			week.push({
				dow: weekdays[next.getDay()],
				date: next.getDate(),
				month: months[next.getMonth()]
			});
		}
		return week;
	}

	// Format Meetup Data for Week View
	function getWeekFormattedMeetups( meetups ) {
	
		let dayArrays = {};

		// For each event create a list item
		meetups.forEach( function( meetup ) {
			let d = getDateFormats( meetup );
			// does d.dow exist within dayArray as array, if not create array
			let dowDay = d.dow + d.day;
			if( !dayArrays[dowDay] ) {
				dayArrays[dowDay] = [];
			}

			let formattedMeetup = '<li id="meetup-' + meetup.id + '" class="week-meetup">'
			+ '<div class="timebox">' + d.time + '</div>'
			+ '<div class="infobox-week">' 
			// + ' <div class="date">' + d.dowFull + ' ' + d.day + '</div>'
			+ ' <div class="title"><a href="' + meetup.event_url + '">' + meetup.name + '</a></div>'
			+ ' <div class="city-week">' + meetup.venue.city + ' - ' + meetup.venue.name + '</div>'
			+ '</div>'
			+'</li>';
			
			dayArrays[dowDay].push(formattedMeetup);
		});
		return dayArrays;
	}
	/**
	 * formatEvents() will get a set of meetups and format accordingly
	 * @param {meetups}
	 * @returns {(object|Array)}
	 */
	function getFormattedMeetups( meetups ) {
		let formattedMeetups = [];

		// For each event create a list item
		meetups.filter( function( meetup ) {
			// Get event formatted dates and time
			let d = getDateFormats( meetup );

			// Formant and add current event to list
			formattedMeetups.push(
				'<li id="meetup-' + meetup.id + '" class="meetup">'
				+ '<div class="datebox">'
				+ ' <div class="dow">' + d.dow + '</div>'
				+ ' <div class="date">' + d.month + ' ' + d.day + '</div>'
				+ ' <div class="time">' + d.time	+ '</div>'
				+ '</div>'
				+ '<div class="infobox">'
				+ ' <div class="title"><a href="' + meetup.event_url + '">' + meetup.name + '</a></div>'
				+ ' <div class="city">' + meetup.venue.city + ' - ' + meetup.venue.name + '</div>'
				+ '</div>'
				+'</li>'
			);
		});
		return formattedMeetups;
	}

	function getDateFormats(meetup) {
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		const weekdays = ['Sunday','Monday','Tueday','Wednesday','Thursday','Friday','Saturday'];
		const dt = new Date(meetup.time);

		// Setup event date info
		let d = {};
		d.year = dt.getFullYear();
		d.yyyy = d.year;
		d.monthFull = months[dt.getMonth()];
		d.month = d.monthFull.substring(0, 3);
		d.m = dt.getMonth()+1;
		d.mm = (d.m > 9)? d.m : "0"+d.m;
		d.d = dt.getDate();
		d.dowFull = weekdays[dt.getDay()];
		d.dow = d.dowFull.substring(0, 3);
		d.day = (d.d > 9)? d.d : "0"+d.d;
		d.dd = d.day;
		d.time = formatAMPM( dt );
		return d;
	}

	function formatAMPM(date) {
		let hours = date.getHours();
		let minutes = date.getMinutes();
		let ampm = hours >= 12 ? 'pm' : 'am';
		hours = hours % 12;
		hours = hours ? hours : 12; // the hour '0' should be '12'
		minutes = minutes < 10 ? '0'+minutes : minutes;
		let strTime = hours + ':' + minutes + ' ' + ampm;
		return strTime;
	}

	/**
	 * Get initial set of group meetups
	 */
	$(document).ready(function() {
		// Get intial set of meetups
		getData( api.url, processData, api.err);

		// Toggle between calendar and list views
		$( "#weekbutton" ).on('click', function() {     
			$('.meetups').hide();
			$('.weekview').show();
		});

		$( "#listbutton" ).on('click', function() {     
			$('.weekview').hide();
			$('.meetups').show();
		});

		// Click Event for Load More
		$('.meetups').on('click','.load-more a',function(e) {
			e.preventDefault();
			api.offset++;
			getData( api.url + '&offset=' + api.offset, processData, api.err);
		});

		// Click Popup Event (when it exists) link to go to info
		$('#mapid').on('click', '.leaflet-popup-content a', function(evt) {
			evt.preventDefault();
			let id = evt.target.hash.replace("#", "");
			let meetupListItem = document.getElementById( id );
			meetupListItem.scrollIntoView();
			meetupListItem.classList.add('active');
			setTimeout( () => { meetupListItem.classList.remove('active'); }, 3000);
		});

	});

})();
