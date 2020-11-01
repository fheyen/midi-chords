import React, { Component } from 'react';
import './style/App.css';
// Views
import PianoKeyboard from './components/PianoKeyboard';
// API, data etc.
import MidiInputManager from './lib/MidiInputManager';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { getCHordType2 } from './lib/Chords';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

export default class App extends Component {

    constructor(props) {
        super(props);
        // Setup MIDI input
        new MidiInputManager(
            this.getMidiLiveData,
            this.setMidiLiveData,
            this.addCurrentNote,
            this.removeCurrentNote
        );
        this.state = {
            viewSize: {
                outerWidth: 800,
                outerHeight: 600
            },
            midiLiveData: [],
            currentNotes: new Map()
        };
    }

    componentDidMount() {
        // Scale layout to current screen size
        window.addEventListener('resize', this.onResize, false);
        this.onResize();
    }

    /**
     * Updates the size state when the window size changes
     * so views can react and redraw
     */
    onResize = () => {
        const w = Math.floor(window.innerWidth - 10);
        this.setState({
            viewSize: {
                outerWidth: w,
                // outerHeight: Math.floor(window.innerHeight - 100)
                outerHeight: Math.floor(Math.min(w / 4, window.innerHeight - 200))
            }
        });
    }

    getMidiLiveData = () => this.state.midiLiveData;

    /**
     * Setter for MIDI input from an instrumetn
     * @param {Note[]} data array with notes
     */
    setMidiLiveData = (data) => {
        // Work-around so note_off event handling can immediately find the note_on event
        // eslint-disable-next-line
        this.state.midiLiveData = data;
        this.setState({ midiLiveData: data });
    };

    /**
     * Adds a note that is currently played (e.g. keyboard key pressed)
     * @param {Note} note a note
     */
    addCurrentNote = (note) => {
        const newMap = new Map(this.state.currentNotes);
        newMap.set(note.pitch, note);
        this.setState({ currentNotes: newMap });
    }

    /**
     * Removes a currently played note (e.g. keyboard key no longer pressed)
     * @param {number} pitch pitch of the note to remove
     */
    removeCurrentNote = (pitch) => {
        const newMap = new Map(this.state.currentNotes);
        newMap.delete(pitch);
        this.setState({ currentNotes: newMap });
    }

    render() {
        const s = this.state;
        const notes = Array.from(s.currentNotes.values())
            .sort((a, b) => a.pitch - b.pitch);
        // const chord = getChordType(notes);
        // console.log(chord);
        const chord2 = getCHordType2(notes);
        console.log(chord2);
        return (
            <div className={`App dark`} >
                <div className='chordInfo'>
                    <div>
                        {Array.from(notes)
                            .map(d => d.getName())
                            .join(' ')}
                    </div>
                    {/* <div>
                        Type: {chord.name}
                    </div> */}
                    <div>
                        Chord name: {chord2.join(', ')}
                    </div>
                </div>
                <div className='explanation'>
                    <span>
                        <FontAwesomeIcon icon={faInfoCircle} />&nbsp;
                        Connect a MIDI device and play some notes to see the chord type.
                    </span>
                </div>
                <PianoKeyboard
                    name='Piano Keyboard'
                    viewSize={s.viewSize}
                    theme='dark'
                    currentNotes={s.currentNotes}
                />
                <div className='githubLink'>
                    <p>
                        <a href='https://github.com/fheyen/midi-chords'>
                            <FontAwesomeIcon icon={faGithub} />&nbsp;
                            https://github.com/fheyen/midi-chords
                        </a>
                    </p>
                    <p>
                        Using&nbsp;
                        <a href='https://github.com/tonaljs/tonal/tree/master/packages/chord-detect'>
                            tonaljs
                        </a>.
                    </p>
                </div>
            </div >
        );
    }
}
