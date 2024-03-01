// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   extension.js                                       :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: marde-vr <marde-vr@42angouleme.fr>         +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2024/03/01 06:49:08 by marde-vr          #+#    #+#             //
//   Updated: 2024/03/01 13:21:42 by marde-vr         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const Main = imports.ui.main;
const {St} = imports.gi;
const GObject = imports.gi.GObject;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Soup = imports.gi.Soup;
const GLib = imports.gi.GLib;

function get_time(delta)
{
// calculate (and subtract) whole days
var days = Math.floor(delta / 86400);
delta -= days * 86400;

// calculate (and subtract) whole hours
var hours = Math.floor(delta / 3600) % 24;
delta -= hours * 3600;

// calculate (and subtract) whole minutes
var minutes = Math.floor(delta / 60) % 60;
delta -= minutes * 60;

// what's left is seconds
var seconds = Math.floor(delta % 60);  // in theory the modulus is not required
if(seconds < 10)
	seconds = "0"+seconds
if(minutes < 10)
	minutes = "0" + minutes
if (hours < 10)
	hours = "0" + hours
return(days.toString() + " days " + hours + ":"+minutes+":"+seconds);
}

function promptForNewDate(callback) {
	let proc = Gio.Subprocess.new(['sh', '-c', 'zenity --calendar --date-format="%m/%d/%Y"'], Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

	proc.communicate_utf8_async(null, null, (proc, res) => {
		try {
			let [, stdout, stderr] = proc.communicate_utf8_finish(res);
			callback(stdout ? stdout.trim() : null, stderr ? stderr.trim() : null);
		} catch (e) {
			logError(e);
		}
	});
}

const counter = GObject.registerClass(
class counter extends PanelMenu.Button {
	_init (ctDate) {
		super._init(0.5);
		this.ctDate = ctDate;
		this.box = new St.BoxLayout();
	  	let icon = new St.Label({
        	text: get_time(((new Date(ctDate)).getTime() - (new Date()).getTime())/1000),
			y_align: Clutter.ActorAlign.CENTER
     	});
	  	this.box.add(icon);

		let toplabel = new St.Label({
    	  y_expand: true,
    	  y_align: Clutter.ActorAlign.CENTER
    	});
   		this.box.add(toplabel);
		this.add_child(this.box);

		// Add click event listener
		this.connect('button-press-event', () => {
			this.showDatePopup();
		});
	}

	showDatePopup() {
		promptForNewDate((newDate, stderr) => {
			if (stderr) {
				logError(`Error: ${stderr}`);
				return;
			}
	
			if (newDate !== null) {
				// Update dateLabel with the new date
				console.log('New date selected:', newDate);
				//this._init(newDate);
				this.ctDate = newDate;
                this.updateDateLabel(); // Update the displayed date
				saveDateToFile(newDate);
			}
			else {
				console.log("No new date selected");
			}
		});
	}

    updateDateLabel() {
        // Update the label text to reflect the new date
        let icon = this.box.get_child_at_index(0);
        icon.text = get_time(((new Date(this.ctDate)).getTime() - (new Date()).getTime())/1000);
    }
});

function init()
{
}

function ensureDirectoryExists(filePath) {
    let directory = Gio.File.new_for_path(filePath).get_parent();
    if (!directory.query_exists(null)) {
        directory.make_directory_with_parents(null);
    }
}

function saveDateToFile(date) {
    let filePath = GLib.get_home_dir() + "/.config/simple_countdown/date.txt";
    ensureDirectoryExists(filePath); // Ensure directory exists

try {
        let file = Gio.File.new_for_path(filePath);
        let [success, errorMessage] = file.replace_contents(date, null, false, Gio.FileCreateFlags.NONE, null);
        if (!success) {
            throw new Error(`Failed to write date to file: ${errorMessage}`);
        }
    } catch (e) {
        console.log(`Error saving date to file: ${e}`);
    }
}

function loadDateFromFile() {
    let filePath = GLib.get_home_dir() + "/.config/simple_countdown/date.txt";
    let file = Gio.File.new_for_path(filePath);
    if (file.query_exists(null)) {
        let [success, contents] = file.load_contents(null);
        if (success) {
            return contents.toString();
        } else {
            logError("Failed to load date from file");
        }
    }
    return null;
}

function enable()
{
	let initialDate = loadDateFromFile() || "05/22/2024";
    let ct = new counter(initialDate); // Create an instance of counter
    Main.panel.addToStatusArea('ct', ct, 1, "left");

    setInterval(() => {
        // Update the label text periodically
        ct.updateDateLabel();
    }, 1000);
}

function disable()
{
	ct.destroy();
	ct = null;
}
