import React, { PureComponent } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsAltH, faArrowsAltV, faLongArrowAltLeft, faLongArrowAltUp, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

export default class View extends PureComponent {

    /**
     * @param {Props} props props
     * @param {Obbject} margin margin
     * @param {number} rowSpan number of rows this view initially has
     * @param {number} colSpan number of columns this view initially has
     * @param {boolean} canResizeRows allow to resize rows?
     * @param {boolean} canResizeColumns allow to resize columns?
     */
    constructor(
        props,
        margin = { top: 0, right: 0, bottom: 0, left: 0 },
        rowSpan = 1,
        columnSpan = 1,
        canResizeRows = true,
        canResizeColumns = true,
    ) {
        super(props);
        const { outerWidth, outerHeight } = props.viewSize;
        const viewWidth = outerWidth * columnSpan;
        const viewHeight = outerHeight * rowSpan;
        this.state = {
            rowSpan,
            columnSpan,
            canResizeRows,
            canResizeColumns,
            rowlimit: 12,
            columnLimit: 2,
            outerWidth,
            outerHeight,
            viewHeight,
            viewWidth,
            margin,
            width: (outerWidth * columnSpan) - margin.left - margin.right,
            height: (outerHeight * rowSpan) - margin.top - margin.bottom,
        };
    }

    /**
     * Views shoud overwrite this method,
     * to react to resizing.
     * This method is called by resizeComponent (see below).
     */
    onResize = () => { }

    /**
     * Resizes the component by updating the width and height depending on
     * the received outerWidth and outerHeight props and the internal margin.
     * After updating the state, the callback function will be called.
     * @param {Object} component
     * @param {Function} callback
     * @param {Object} additionalState other properties to set in the state
     */
    resizeComponent(additionalState = {}) {
        const { outerWidth, outerHeight } = this.props.viewSize;
        const { outerWidth: ow, outerHeight: oh, margin, rowSpan, columnSpan } = this.state;
        if (ow !== outerWidth || oh !== outerHeight) {
            const viewWidth = outerWidth * columnSpan;
            const viewHeight = outerHeight * rowSpan;
            this.setState(
                {
                    ...additionalState,
                    outerWidth,
                    outerHeight,
                    viewWidth,
                    viewHeight,
                    width: (outerWidth * columnSpan) - margin.left - margin.right,
                    height: (outerHeight * rowSpan) - margin.top - margin.bottom,
                },
                this.onResize
            );
        }
    }

    increaseRows = () => {
        const { rowSpan, rowlimit, margin, canResizeRows } = this.state;
        const { outerHeight } = this.props.viewSize;
        if (!canResizeRows) { return; }
        if (rowSpan >= rowlimit) { return; }
        const newSpan = rowSpan + 1;
        const viewHeight = outerHeight * newSpan;
        this.setState(
            {
                rowSpan: newSpan,
                viewHeight,
                height: viewHeight - margin.top - margin.bottom
            },
            this.onResize
        );
    }

    decreaseRows = () => {
        const { rowSpan, margin, canResizeRows } = this.state;
        const { outerHeight } = this.props.viewSize;
        if (!canResizeRows) { return; }
        if (rowSpan <= 1) { return; }
        const newSpan = rowSpan - 1;
        const viewHeight = outerHeight * newSpan;
        this.setState(
            {
                rowSpan: newSpan,
                viewHeight,
                height: viewHeight - margin.top - margin.bottom
            },
            this.onResize
        );
    }

    increaseColumns = () => {
        const { columnSpan, columnLimit, margin, canResizeColumns } = this.state;
        const { outerWidth } = this.props.viewSize;
        if (!canResizeColumns) { return; }
        if (columnSpan >= columnLimit) { return; }
        const newSpan = columnSpan + 1;
        const viewWidth = outerWidth * newSpan;
        this.setState(
            {
                columnSpan: newSpan,
                viewWidth,
                width: viewWidth - margin.left - margin.right
            },
            this.onResize
        );
    }

    decreaseColumns = () => {
        const { columnSpan, margin, canResizeColumns } = this.state;
        const { outerWidth } = this.props.viewSize;
        if (!canResizeColumns) { return; }
        if (columnSpan <= 1) { return; }
        const newSpan = columnSpan - 1;
        const viewWidth = outerWidth * newSpan;
        this.setState(
            {
                columnSpan: newSpan,
                viewWidth,
                width: viewWidth - margin.left - margin.right
            },
            this.onResize
        );
    }

    close = () => {
        const { toggleView, name } = this.props;
        if (toggleView && name) {
            toggleView(name);
        }
    }

    /**
     * Returns the HTML (JSX) for the view size control buttons
     */
    getSizeControlHTML = () => (
        <div className='sizeControl'>
            {this.state.canResizeRows && (
                <span>
                    <button
                        onClick={this.increaseRows
                        }
                        title={'Increase rows'}
                        disabled={this.state.rowSpan >= this.state.rowlimit}
                    >
                        <FontAwesomeIcon icon={faArrowsAltV} />
                    </button >
                    <button
                        onClick={this.decreaseRows}
                        title={'Decrease rows'}
                        disabled={this.state.rowSpan <= 1}
                    >
                        <FontAwesomeIcon icon={faLongArrowAltUp} />
                    </button>
                </span>
            )}
            {this.state.canResizeColumns && (
                <span>
                    <button
                        onClick={this.increaseColumns}
                        title={'Increase columns'}
                        disabled={this.state.columnSpan >= this.state.columnLimit}
                    >
                        <FontAwesomeIcon icon={faArrowsAltH} />
                    </button>
                    <button
                        onClick={this.decreaseColumns}
                        title={'Decrease columns'}
                        disabled={this.state.columnSpan <= 1}
                    >
                        <FontAwesomeIcon icon={faLongArrowAltLeft} />
                    </button>
                </span>
            )}
            <button
                onClick={this.close}
                title={'Close'}
            >
                <FontAwesomeIcon icon={faTimesCircle} />
            </button>
        </div >
    );
}
