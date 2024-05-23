/**
 * @author Eberhard Graether / http://egraether.com/
 * @author Mark Lundin  / http://mark-lundin.com
 */

THREE.TrackballControls = function (object, domElement ) {

    var _this = this;
    var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM_PAN: 4 };

    this.object = object;
    this.domElement = ( domElement !== undefined ) ? domElement : document;

    // API

    this.enabled = true;

    this.screen = { left: 0, top: 0, width: 0, height: 0 };

    this.zoomSpeed = 1.2;
    this.noZoom = false;

    this.staticMoving = false;
    this.dynamicDampingFactor = 0.2;


    this.keys = [ 65 /*A*/, 83 /*S*/, 68 /*D*/ ];

    // internals

    this.target = new THREE.Vector3();

    var EPS = 0.000001;

    var lastPosition = new THREE.Vector3();

    var _state = STATE.NONE,

    _eye = new THREE.Vector3(),

    _zoomStart = new THREE.Vector2(),
    _zoomEnd = new THREE.Vector2(),

    _touchZoomDistanceStart = 0,
    _touchZoomDistanceEnd = 0;


    // events

    var changeEvent = { type: 'change' };
    var startEvent = { type: 'start'};
    var endEvent = { type: 'end'};




    this.zoomCamera = function () {

        if ( _state === STATE.TOUCH_ZOOM_PAN ) {

            var factor = _touchZoomDistanceStart / _touchZoomDistanceEnd;
            _touchZoomDistanceStart = _touchZoomDistanceEnd;
            _eye.multiplyScalar( factor );

        } else {

            var factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * _this.zoomSpeed;

            if ( factor !== 1.0 && factor > 0.0 ) {

                _eye.multiplyScalar( factor );

                if ( _this.staticMoving ) {

                    _zoomStart.copy( _zoomEnd );

                } else {

                    _zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;

                }

            }

        }

    };



    this.update = function () {

        _eye.subVectors( _this.object.position, _this.target );


        if ( !_this.noZoom ) {

            _this.zoomCamera();

        }


        _this.object.position.addVectors( _this.target, _eye );


        _this.object.lookAt( _this.target );

        if ( lastPosition.distanceToSquared( _this.object.position ) > EPS ) {

            _this.dispatchEvent( changeEvent );

            lastPosition.copy( _this.object.position );

        }

    };


    function mousewheel( event ) {

        if ( _this.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        var delta = 0;

        if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9

            delta = event.wheelDelta / 40;

        } else if ( event.detail ) { // Firefox

            delta = - event.detail / 3;

        }

        _zoomStart.y += delta * 0.01;
        _this.dispatchEvent( startEvent );
        _this.dispatchEvent( endEvent );

    }


    this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

    this.domElement.addEventListener( 'mousewheel', mousewheel, false );
    this.domElement.addEventListener( 'DOMMouseScroll', mousewheel, false ); // firefox


    // force an update at start
    this.update();

};

THREE.TrackballControls.prototype = Object.create( THREE.EventDispatcher.prototype );