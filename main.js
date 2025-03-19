require([
	"esri/WebScene",
	"esri/views/SceneView",
  "esri/geometry/Point",
  "esri/geometry/Extent",
  "esri/Graphic",
	"esri/layers/FeatureLayer",
	"esri/layers/CSVLayer",
	"esri/layers/VectorTileLayer",
	"esri/layers/GraphicsLayer",
	"esri/layers/support/LabelClass",
	"esri/symbols/WebStyleSymbol",
	"esri/widgets/Search",
	"esri/widgets/Expand",
	"esri/widgets/DirectLineMeasurement3D",
	"esri/widgets/ElevationProfile",
	"esri/widgets/LineOfSight",
	"esri/widgets/Legend",
	"esri/widgets/BasemapGallery",
	"esri/widgets/Sketch",
	"esri/widgets/Editor",
  "esri/widgets/LayerList",
  "esri/layers/BaseElevationLayer",
  "esri/layers/ElevationLayer"
], function (WebScene, SceneView, Point, Extent, Graphic,
	FeatureLayer, CSVLayer, VectorTileLayer, GraphicsLayer, LabelClass,
	WebStyleSymbol,
	Search, Expand, DirectLineMeasurement3D, ElevationProfile, LineOfSight, Legend, BasemapGallery, Sketch, Editor, LayerList,
  BaseElevationLayer, ElevationLayer) {

  /*
  const boxMsg = (title,msg)=>{
      let modal = document.getElementById("modal");
      let modalTitle = document.getElementById("modal-msg");
      let body = document.getElementById("modal-body");
      let close = document.getElementById("close");

      modalTitle.innerHTML = title;
      body.innerHTML = msg;

      modal.setAttribute("active", "active");

      close.onclick = ()=>{
          modalTitle.innerHTML = "";
          body.innerHTML = "";
          modal.removeAttribute("active");
      }
  }

  const htmlBtnCalcular = document.getElementById("button-id");

  htmlBtnCalcular.onclick = ()=>{
      let graphics = sketchLayer.graphics.items;
      if (graphics.length > 0) {
          let item = graphics[0].geometry
          queryStreetLayer(item).then(generatePoints);
      } else {
          boxMsg("Ops!", "Nenhum graphics encontrado");
      }
  }

  function queryStreetLayer(drawPolygon) {
      var query = layerOsmHighways.createQuery();
      query.geometry = drawPolygon;
      query.spatialRelationship = "intersects";
      query.outSpatialReference = 4326;
      return layerOsmHighways.queryFeatures(query);
  }

  function generatePoints(streets) {

      // remove previous graphics
      window.layerPointResult.queryFeatures().then(function(results) {

            // remove previous result
            window.layerPointResult.applyEdits({
                deleteFeatures: results.features
            });

            // add new graphics
            const graphicsToAdd = [];
            streets.features.forEach((street) => {

                // calculate points for each given distance
                let generatedPoints = getPointsEachXMetersAlongLine(street.geometry, 30);

                // plot points in result layer
                generatedPoints.forEach((generatedPoint) => {
                if (generatedPoint) {
                    let pointGraphic = new Graphic({
                        geometry: generatedPoint
                    });
                    graphicsToAdd.push(pointGraphic);
                }
                })

                // add line of sight widgets to each point

            });

            // update layer
            window.layerPointResult.applyEdits({
                addFeatures: graphicsToAdd
            });

      });
  }
  */

  function distanceBetweenPoints(x1, y1, x2, y2) {
      return Math.sqrt(Math.pow(x2 - x1, 2) + (Math.pow(y2 - y1, 2)));
  }

  function getPointsEachXMetersAlongLine(polyline, distanceInMetersForEachPoint) {

    let generatedPoints = [];
    
    // convert distance to factor
    /// 0,0001 == 11m
    let distanceFactorForEachPoint = distanceInMetersForEachPoint * 0.0001 / 11;
    let currentDistance = 0;

    let currentPoint = getPointAlongLine(polyline, currentDistance);

    while (currentPoint) {
        generatedPoints.push(currentPoint);
        currentDistance += distanceFactorForEachPoint;
        currentPoint = getPointAlongLine(polyline, currentDistance)
    }

    return generatedPoints;
}

  function getPointAlongLine(polyline, distance, pathIndex) {
      if (!pathIndex)
          pathIndex = 0;

      if (!distance)
          distance = 0;

      if ((pathIndex >= 0) && (pathIndex < polyline.paths.length)) {
          var path = polyline.paths[pathIndex];
          var x1, x2, x3, y1, y2, y3;
          var travelledDistance = 0;
          var pathDistance;
          var distanceDiff;
          var angle;

          if (distance === 0)
              return polyline.getPoint(pathIndex, 0);
          else if (distance > 0) {
              for (var i = 1; i < path.length; i++) {
                  x1 = path[i - 1][0];
                  y1 = path[i - 1][1];
                  x2 = path[i][0];
                  y2 = path[i][1];

                  pathDistance = distanceBetweenPoints(x1, y1, x2, y2);
                  travelledDistance += pathDistance;

                  if (travelledDistance === distance)
                      return polyline.getPoint(pathIndex, i);
                  else if (travelledDistance > distance) {
                      distanceDiff = pathDistance - (travelledDistance - distance);

                      angle = Math.atan2(y2 - y1, x2 - x1);

                      x3 = distanceDiff * Math.cos(angle);
                      y3 = distanceDiff * Math.sin(angle);

                      return new Point(x1 + x3,y1 + y3,polyline.spatialReference);
                  }
              }
          }
      }

      return null;
  }

  const ExaggeratedElevationLayer = BaseElevationLayer.createSubclass({
    properties: {
      exaggeration: 5
    },

    load: function() {
      this._elevation = new ElevationLayer({
        url: "//elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/TopoBathy3D/ImageServer"
      });

      // wait for the elevation layer to load before resolving load()
      this.addResolvingPromise(
        this._elevation.load().then(() => {
          // get tileInfo, spatialReference and fullExtent from the elevation service
          // this is required for elevation services with a custom spatialReference
          this.tileInfo = this._elevation.tileInfo;
          this.spatialReference = this._elevation.spatialReference;
          this.fullExtent = this._elevation.fullExtent;
        })
      );

      return this;
    },

    // This method must be implemented for every elevation service
    fetchTile: function(level, row, col, options) {
      // calls fetchTile() on the elevationlayer for the tiles
      // the data is returned as a heightmap
      return this._elevation.fetchTile(level, row, col, options)
        .then((data) => {
          // multiply every value by the exaggeration
          for (let i = 0; i < data.values.length; i++) {
            data.values[i] = data.values[i] * this.exaggeration;
          }

          return data;
        });
    }
  });

  var basemapLayer = new VectorTileLayer({
      url: "https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer"
  });
  basemapLayer.loadStyle("OpenStreetMapEsriLightGrayCanvasBase.json");

  // Create the web scene with custom elevation layer
  var map = new WebScene({
    //   ground: {
    //     layers: [new ExaggeratedElevationLayer()]
    //   },
      basemap: "topo-3d"
  });
  // Create the view
  var view = new SceneView({
      container: "viewDiv",
      qualityProfile: "high",
      // qualityProfile: "low",
      map: map,
      camera: {
        position: {
            latitude: -23.999131658709025,
            longitude: -46.55439762885409,
            z:24920.23517484404
        },
        tilt: 56.999999999999496
    },
      environment: {
          lighting: {
              date: new Date("June 15, 2015 12:00:00 EDT"),
              directShadowsEnabled: true,
              ambientOcclusionEnabled: true
          }
      }
  });

  // Function to get camera position
  function getCameraPosition() {
      return {
          camera: {
              position: {
                  latitude: view.camera.position.latitude,
                  longitude: view.camera.position.longitude,
                  z: view.camera.position.z
              },
              tilt: view.camera.tilt
          }
      }

  }

  // Pass view to global variable
  window.view = view;
  window.getCameraPosition = getCameraPosition;

//   // Monitor camera position changes
//   view.watch("camera", function(newValue) {
//     console.log(JSON.stringify(getCameraPosition()));
//   });

  /**********************************************
   * Buildings OSM
   **********************************************/

  function getSymbol(color) {
      return {
          type: "polygon-3d",
          // autocasts as new PolygonSymbol3D()
          symbolLayers: [{
              type: "extrude",
              // autocasts as new ExtrudeSymbol3DLayer()
              material: {
                  color: color
              },
              edges: {
                  type: "solid",
                  color: "#999",
                  size: 0.5
              }
          }]
      };
  }

  const renderer = {
      type: "unique-value",
      // autocasts as new UniqueValueRenderer()
      defaultSymbol: getSymbol([217, 208, 201, 255]),
      defaultLabel: "Other",
      field: "building",
      uniqueValueInfos: [{
          value: "house",
          label: "house",
          symbol: getSymbol([232, 216, 172, 255])
      }, {
          value: "residential",
          label: "residential",
          symbol: getSymbol([232, 216, 172, 255])
      }, {
          value: "detached",
          label: "detached",
          symbol: getSymbol([232, 216, 172, 255])
      }, {
          value: "terrace",
          label: "terrace",
          symbol: getSymbol([221, 198, 146, 255])
      }, {
          value: "apartments",
          label: "apartments",
          symbol: getSymbol([210, 180, 120, 255])
      }, {
          value: "construction",
          label: "construction",
          symbol: getSymbol([252, 146, 31, 255])
      }, {
          value: "commercial",
          label: "commercial",
          symbol: getSymbol([220, 111, 90, 255])
      }, {
          value: "retail",
          label: "retail",
          symbol: getSymbol([220, 111, 90, 255])
      }, {
          value: "hotel",
          label: "hotel",
          symbol: getSymbol([162, 45, 63, 255])
      }, {
          value: "industrial",
          label: "industrial",
          symbol: getSymbol([169, 165, 181, 255])
      }, {
          value: "warehouse",
          label: "warehouse",
          symbol: getSymbol([169, 165, 181, 255])
      }, {
          value: "school",
          label: "school",
          symbol: getSymbol([112, 185, 198, 255])
      }, {
          value: "university",
          label: "university",
          symbol: getSymbol([112, 185, 198, 255])
      }, {
          value: "church",
          label: "church",
          symbol: getSymbol([104, 145, 151, 255])
      }, {
          value: "hospital",
          label: "hospital",
          symbol: getSymbol([45, 137, 185, 255])
      }],
      visualVariables: [{
          type: "size",
          valueExpression: "IIF($feature.building_levels > 0, $feature.building_levels * 3, 6)",
          valueUnit: "meters"// Converts and extrudes all data values in meters
      }]
  };

  const layerOsmBuilding = new FeatureLayer({
      url: "https://services6.arcgis.com/Do88DoK2xjTUCXd1/arcgis/rest/services/OSM_SA_Buildings/FeatureServer",
      renderer: renderer,
      // definitionExpression: "addr_city = 'São José dos Campos'",
      elevationInfo: {
          mode: "on-the-ground"
      },
      title: "Extruded building footprints",
      popupTemplate: {
          // autocasts as new PopupTemplate()
          title: "{name}",
          content: [{
              type: "fields",
              fieldInfos: [{
                  fieldName: "objectid",
                  label: "objectid"
              }, {
                  fieldName: "name",
                  label: "name"
              }, {
                  fieldName: "building",
                  label: "building"
              }, {
                  fieldName: "building_levels",
                  label: "building_levels"
              }, {
                  fieldName: "osm_id2",
                  label: "osm_id2"
              }, {
                  fieldName: "addr_housename",
                  label: "addr_housename"
              }, {
                  fieldName: "addr_housenumber",
                  label: "addr_housenumber"
              }, {
                  fieldName: "addr_street",
                  label: "addr_street"
              }, {
                  fieldName: "addr_city",
                  label: "addr_city"
              }, {
                  fieldName: "addr_state",
                  label: "addr_state"
              }, {
                  fieldName: "addr_postcode",
                  label: "addr_postcode"
              }, {
                  fieldName: "addr_province",
                  label: "addr_province"
              }, {
                  fieldName: "addr_country",
                  label: "addr_country"
              }, {
                  fieldName: "addr_district",
                  label: "addr_district"
              }, {
                  fieldName: "addr_subdistrict",
                  label: "addr_subdistrict"
              }, {
                  fieldName: "addr_unit",
                  label: "addr_unit"
              }, {
                  fieldName: "amenity",
                  label: "amenity"
              }, {
                  fieldName: "brand",
                  label: "brand"
              }, {
                  fieldName: "ele",
                  label: "ele"
              }, {
                  fieldName: "height",
                  label: "height"
              }, {
                  fieldName: "shop",
                  label: "shop"
              }, {
                  fieldName: "source",
                  label: "source"
              }, {
                  fieldName: "wall",
                  label: "wall"
              }, {
                  fieldName: "z_order",
                  label: "z_order"
              }, ]
          }]
      },
      outFields: ["*"],
      labelingInfo: [{
          labelExpressionInfo: {
              value: "{Name}"
          },
          symbol: {
              type: "label-3d",
              // autocasts as new LabelSymbol3D()
              symbolLayers: [{
                  type: "text",
                  // autocasts as new TextSymbol3DLayer()
                  material: {
                      color: "white"
                  },
                  // we set a halo on the font to make the labels more visible with any kind of background
                  halo: {
                      size: 1,
                      color: [50, 50, 50]
                  },
                  size: 10
              }]
          }
      }]
  });

  /**********************************************
 * RESULT POINT LAYERS
 **********************************************/

  let tempGraphic = new Graphic();

  let layerPointResultSymbol = new WebStyleSymbol();
  layerPointResultSymbol.styleName = "EsriRealisticStreetSceneStyle";
  layerPointResultSymbol.name = "Light_On_Post_-_Light_on";
//   layerPointResultSymbol.styleName = "EsriRealisticStreetSceneStyle";
//   layerPointResultSymbol.name = "Overhanging_Street_-_Light_on";
//   layerPointResultSymbol.styleName = "EsriRealisticTransportationStyle";
//   layerPointResultSymbol.name = "Ford_Fiesta";

  const layerPointResult = new FeatureLayer({
      title: "Resultado",
      fields: [{
          name: "ObjectID",
          alias: "ObjectID",
          type: "oid"
      }, {
          name: "name",
          alias: "Name",
          type: "string"
      }],
      objectIdField: "ObjectID",
      geometryType: "point",
      spatialReference: {
          wkid: 4326
      },
      source: [tempGraphic],
      // popupTemplate: pTemplate,
      renderer: {
          type: "simple",
          symbol: layerPointResultSymbol
      },
  });

  layerPointResultSymbol.fetchSymbol().then(function(loadedSymbol) {
    var objectSymbolLayer = loadedSymbol.symbolLayers.getItemAt(0);
    objectSymbolLayer.height *= 10;
    objectSymbolLayer.width *= 10;
    objectSymbolLayer.depth *= 10;

    var renderer = layerPointResult.renderer.clone();
    renderer.symbol = loadedSymbol;
    layerPointResult.renderer = renderer;
  });

  window.layerPointResult = layerPointResult;

  /**********************************************
 * OTHER LAYERS
 **********************************************/

  var mapLayers = []

  // Sketch Layer
  const sketchLayer = new GraphicsLayer();
  sketchLayer.title = "Desenho";

  // OSM_Amenities_SA
  const layerOsmAmenities = new FeatureLayer({
    url: "https://services6.arcgis.com/Do88DoK2xjTUCXd1/arcgis/rest/services/OSM_SA_Amenities/FeatureServer",
    elevationInfo: {
      mode: "relative-to-scene"
    },
    outFields: ["*"],
    labelingInfo: [{
      labelExpressionInfo: {
        value: "{Name}"
      },
      symbol: {
        type: "label-3d", // autocasts as new LabelSymbol3D()
        symbolLayers: [{
          type: "text", // autocasts as new TextSymbol3DLayer()
          material: {
            color: "white"
          },
          // we set a halo on the font to make the labels more visible with any kind of background
          halo: {
            size: 1,
            color: [50, 50, 50]
          },
          size: 10
        }]
      }
    }]
  });

  // OSM_Shops_SA
  const layerOsmShops = new FeatureLayer({
    url: "https://services6.arcgis.com/Do88DoK2xjTUCXd1/arcgis/rest/services/OSM_SA_Shops/FeatureServer",
    elevationInfo: {
      mode: "relative-to-scene"
    },
    outFields: ["*"],
    labelingInfo: [{
      labelExpressionInfo: {
        value: "{Name}"
      },
      symbol: {
        type: "label-3d", // autocasts as new LabelSymbol3D()
        symbolLayers: [{
          type: "text", // autocasts as new TextSymbol3DLayer()
          material: {
            color: "white"
          },
          // we set a halo on the font to make the labels more visible with any kind of background
          halo: {
            size: 1,
            color: [50, 50, 50]
          },
          size: 10
        }]
      }
    }]
  });

  // OSM_Medical_Facilities_SA
  const layerOsmMedicalFacilities = new FeatureLayer({
    url: "https://services6.arcgis.com/Do88DoK2xjTUCXd1/arcgis/rest/services/OSM_SA_Medical/FeatureServer",
    elevationInfo: {
      mode: "relative-to-scene"
    },
    outFields: ["*"],
    labelingInfo: [{
      labelExpressionInfo: {
        value: "{Name}"
      },
      symbol: {
        type: "label-3d", // autocasts as new LabelSymbol3D()
        symbolLayers: [{
          type: "text", // autocasts as new TextSymbol3DLayer()
          material: {
            color: "white"
          },
          // we set a halo on the font to make the labels more visible with any kind of background
          halo: {
            size: 1,
            color: [50, 50, 50]
          },
          size: 10
        }]
      }
    }]
  });

  // OSM_Highways_SA
  const layerOsmHighways = new FeatureLayer({
      url: "https://services6.arcgis.com/Do88DoK2xjTUCXd1/arcgis/rest/services/OSM_SA_Highways/FeatureServer",
      elevationInfo: {
          mode: "relative-to-scene"
      },
      outFields: ["*"],
      labelingInfo: [{
          labelExpressionInfo: {
              value: "{Name}"
          },
          symbol: {
              type: "label-3d",
              // autocasts as new LabelSymbol3D()
              symbolLayers: [{
                  type: "text",
                  // autocasts as new TextSymbol3DLayer()
                  material: {
                      color: "white"
                  },
                  // we set a halo on the font to make the labels more visible with any kind of background
                  halo: {
                      size: 1,
                      color: [50, 50, 50]
                  },
                  size: 10
              }]
          }
      }],
      popupTemplate: {
          // autocasts as new PopupTemplate()
          title: "{name}",
          content: [{
              type: "fields",
              fieldInfos: [{
                  fieldName: "objectid",
                  label: "objectid"
              }, {
                  fieldName: "name",
                  label: "name"
              }, {
                  fieldName: "osm_id2",
                  label: "osm_id2"
              }, {
                  fieldName: "access",
                  label: "access"
              }, {
                  fieldName: "bicycle",
                  label: "bicycle"
              }, {
                  fieldName: "bridge",
                  label: "bridge"
              }, {
                  fieldName: "bus",
                  label: "bus"
              }, {
                  fieldName: "crossing",
                  label: "crossing"
              }, {
                  fieldName: "foot",
                  label: "foot"
              }, {
                  fieldName: "footway",
                  label: "footway"
              }, {
                  fieldName: "highway",
                  label: "highway"
              }, {
                  fieldName: "lanes",
                  label: "lanes"
              }, {
                  fieldName: "layer",
                  label: "layer"
              }, {
                  fieldName: "maxspeed",
                  label: "maxspeed"
              }, {
                  fieldName: "oneway",
                  label: "oneway"
              }, {
                  fieldName: "public_transport",
                  label: "public_transport"
              }, {
                  fieldName: "service",
                  label: "service"
              }, {
                  fieldName: "source",
                  label: "source"
              }, {
                  fieldName: "surface",
                  label: "surface"
              }, {
                  fieldName: "tracktype",
                  label: "tracktype"
              }, {
                  fieldName: "width",
                  label: "width"
              }]
          }]
      },
  });

  // OSM_Highways_SA
  const layerWaterways = new FeatureLayer({
      url: "https://services6.arcgis.com/Do88DoK2xjTUCXd1/arcgis/rest/services/OSM_SA_Waterways/FeatureServer",
      minScale: 10000,
      elevationInfo: {
          mode: "relative-to-scene"
      },
      outFields: ["*"],
      renderer: {
          type: "simple",
          symbol: {
              type: "simple-line",
              color: "#4AA0E8",
              width: 2
          }
      },
      labelingInfo: [{
          labelExpressionInfo: {
              value: ""
          },
          symbol: {
              type: "label-3d",
              // autocasts as new LabelSymbol3D()
              symbolLayers: [{
                  type: "text",
                  // autocasts as new TextSymbol3DLayer()
                  material: {
                      color: "white"
                  },
                  // we set a halo on the font to make the labels more visible with any kind of background
                  halo: {
                      size: 1,
                      color: [50, 50, 50]
                  },
                  size: 10
              }]
          }
      }],
      popupTemplate: {
          // autocasts as new PopupTemplate()
          title: "{name}",
          content: [{
              type: "fields",
              fieldInfos: [{
                  fieldName: "objectid",
                  label: "objectid"
              }, {
                  fieldName: "name",
                  label: "name"
              }, {
                  fieldName: "osm_id2",
                  label: "osm_id2"
              }, {
                  fieldName: "access",
                  label: "access"
              }, {
                  fieldName: "bicycle",
                  label: "bicycle"
              }, {
                  fieldName: "bridge",
                  label: "bridge"
              }, {
                  fieldName: "bus",
                  label: "bus"
              }, {
                  fieldName: "crossing",
                  label: "crossing"
              }, {
                  fieldName: "foot",
                  label: "foot"
              }, {
                  fieldName: "footway",
                  label: "footway"
              }, {
                  fieldName: "highway",
                  label: "highway"
              }, {
                  fieldName: "lanes",
                  label: "lanes"
              }, {
                  fieldName: "layer",
                  label: "layer"
              }, {
                  fieldName: "maxspeed",
                  label: "maxspeed"
              }, {
                  fieldName: "oneway",
                  label: "oneway"
              }, {
                  fieldName: "public_transport",
                  label: "public_transport"
              }, {
                  fieldName: "service",
                  label: "service"
              }, {
                  fieldName: "source",
                  label: "source"
              }, {
                  fieldName: "surface",
                  label: "surface"
              }, {
                  fieldName: "tracktype",
                  label: "tracktype"
              }, {
                  fieldName: "width",
                  label: "width"
              }]
          }]
      },
  });

  

  /**********************************************
   * Monitoring Stations Layer
   **********************************************/
  const stationsRenderer = {
    type: "simple",
    symbol: {
        type: "point-3d",
        symbolLayers: [{
          type: "icon",
          resource: { primitive: "circle" },
          material: { color: "#D13470" },
          size: 10,
          outline: {
            color: "white",
            size: 2
          }
        }],
        verticalOffset: {
          screenLength: 60
        },
        callout: {
          type: "line", // autocasts as new LineCallout3D()
          color: "white",
          size: 1,
          border: {
            color: "#D13470"
          }
        }
      }
  };

  const stationsPopupTemplate = {
    title: "{nome} - {elevacao}m",
    content: [
      {
        type: "fields",
        fieldInfos: [
          {
            fieldName: "posto",
            label: "Posto"
          },
          {
            fieldName: "Código API - FLU",
            label: "Código API"
          },
          {
            fieldName: "minDate",
            label: "Data Inicial"
          }
        ]
      }
    ]
  };

  const stationsLayer = new CSVLayer({
    title: "Estações de Monitoramento",
    url: "stations_flu.csv",
    copyright: "OpenStreetMap",
    latitudeField: "lat",
    longitudeField: "lon",
    spatialReference: { wkid: 4326 },
    labelingInfo: [{
      labelExpression: "[{nome}] {elevacao}m",
      labelPlacement: "above-center",
      symbol: {
        type: "text",
        color: "#FFFFFF",
        haloSize: 1,
        haloColor: "#000000"
      }
    }],
    popupTemplate: stationsPopupTemplate,
    elevationInfo: {
        mode: "relative-to-ground"
    },
    returnZ: false,
    screenSizePerspectiveEnabled: false,
    // Set a renderer that will show the points with icon symbols
    renderer: stationsRenderer,
    labelingInfo: [{
      labelExpressionInfo: {
        value: "{nome} - {elevacao}m"
      },
      symbol: {
        type: "label-3d",
        symbolLayers: [{
          type: "text",
          material: {
            color: "white"
          },
          halo: {
            size: 3,
            color: "black"
          },
          size: 11
        }]
      }
    }]
  });

  // Station navigation state
  let currentStationIndex = -1;
  let stationFeatures = [];

  // Function to navigate to a station
  function navigateToStation(index) {
    if (stationFeatures.length === 0) return;
    
    currentStationIndex = index;
    const station = stationFeatures[currentStationIndex];
    
    // Highlight current station
    stationsLayer.renderer = {
      type: "simple",
      symbol: {
        type: "point-3d",
        symbolLayers: [{
          type: "icon",
          resource: { primitive: "circle" },
          material: { color: station.attributes.ObjectId === stationFeatures[currentStationIndex].attributes.ObjectId ? "#4CE13F" : "#D13470" },
          size: 10,
          outline: {
            color: "white",
            size: 2
          }
        }],
        verticalOffset: {
          screenLength: 60
        },
        callout: {
          type: "line",
          color: "white",
          size: 1,
          border: {
            color: "#D13470"
          }
        }
      }
    };

    // Navigate camera to station
    view.goTo({
      target: station.geometry,
      zoom: 16,
      tilt: 40
    }, {
      duration: 1000,
      easing: "ease-out"
    });
  }

  // Previous station button
  const prevButton = document.createElement("calcite-button");
  prevButton.setAttribute("appearance", "solid");
  prevButton.setAttribute("color", "blue");
  prevButton.setAttribute("icon-start", "chevron-left");
  prevButton.innerHTML = "Previous";
  prevButton.onclick = () => {
    if (currentStationIndex > 0) {
      navigateToStation(currentStationIndex - 1);
    }
  };

  // Next station button
  const nextButton = document.createElement("calcite-button");
  nextButton.setAttribute("appearance", "solid");
  nextButton.setAttribute("color", "blue");
  nextButton.setAttribute("icon-end", "chevron-right");
  nextButton.innerHTML = "Next";
  nextButton.onclick = () => {
    if (currentStationIndex < stationFeatures.length - 1) {
      navigateToStation(currentStationIndex + 1);
    }
  };

  // Overview button
  const overviewButton = document.createElement("calcite-button");
  overviewButton.setAttribute("appearance", "solid");
  overviewButton.setAttribute("color", "blue");
  overviewButton.setAttribute("icon-start", "zoom-out-fixed");
  overviewButton.innerHTML = "Overview";
  overviewButton.onclick = () => {
    view.goTo({
        position: {
            latitude: -23.999131658709025,
            longitude: -46.55439762885409,
            z:24920.23517484404
        },
        tilt: 56.999999999999496
    }, {
      duration: 1000,
      easing: "ease-out"
    });
  };

  // Add navigation container
  const navContainer = document.createElement("div");
  navContainer.style.display = "flex";
  navContainer.style.gap = "8px";
  navContainer.appendChild(prevButton);
  navContainer.appendChild(overviewButton);
  navContainer.appendChild(nextButton);

  view.ui.add(navContainer, "bottom-left");

  // Load stations when layer is ready
  stationsLayer.when(() => {
    stationsLayer.queryFeatures().then(async result => {
        // Query elevation for each station
        const elevationLayer = new ElevationLayer({
          url: "//elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/TopoBathy3D/ImageServer"
        });
        for(const feature of result.features) {
          const elevation = await elevationLayer.queryElevation(feature.geometry);
          feature.attributes.elevacao = elevation.geometry.z.toFixed(1);
        }
      stationFeatures = result.features;
      
    });
  });

  // Layers in map
//   mapLayers.push(layerPointResult);
  mapLayers.push(sketchLayer);
//   mapLayers.push(layerOsmBuilding);
//   mapLayers.push(layerOsmHighways);
  mapLayers.push(layerWaterways);
  mapLayers.push(stationsLayer);
//   mapLayers.push(layerOsmAmenities);
//   mapLayers.push(layerOsmShops);
//   mapLayers.push(layerOsmMedicalFacilities);

  /**********************************************
 * WIDGETS
 **********************************************/

  // Search
  var widgetSearch = new Search({
      view: view,
      allPlaceholder: "Endereço",
      includeDefaultSources: true,
  });
  view.ui.add(widgetSearch, {
      position: "top-right"
  });
  // view.ui.add(new Expand({ view: view, content: widgetSearch, expandTooltip: "Procurar endereço" }), "top-right");

  // Sketch
  const widgetSketch = new Sketch({
      layer: sketchLayer,
      view: view,
      // graphic will be selected as soon as it is created
      creationMode: "update"
  });
  view.ui.add(new Expand({
      view: view,
      content: widgetSketch,
      expandTooltip: "Desenhar",
      expandIconClass: "esri-icon-sketch-rectangle"
  }), "top-right");

  // Layer List
  const widgetLayerList = new LayerList({
      view: view
  });
  view.ui.add(new Expand({
      view: view,
      content: widgetLayerList,
      expandTooltip: "Camadas"
  }), "top-right");

  // Legend
  var widgetLegend = new Legend({
      view: view,
      // layerInfos: [
      //   {
      //     layer: layerOsmBuilding,
      //     title: "Prédios OpenStreetMap"
      //   }
      // ]
  });
  view.ui.add(new Expand({
      view: view,
      content: widgetLegend,
      expandTooltip: "Legenda"
  }), "top-right");

  // Basemap
  const widgetBasemapGallery = new BasemapGallery({
      view: view
  });
  view.ui.add(new Expand({
      view: view,
      content: widgetBasemapGallery,
      expandTooltip: "Trocar basemap"
  }), "top-right");

  // DirectLineMeasurement3D
  var widgetMeasurement = new DirectLineMeasurement3D({
      view: view
  });
  view.ui.add(new Expand({
      view: view,
      content: widgetMeasurement,
      expandTooltip: "Medir"
  }), "top-right");

  // // Editor
  // const widgetEditor = new Editor({ view: view });
  // view.ui.add(new Expand({ view: view, content: widgetEditor, expandTooltip: "Editar" }), "top-right");

  // LineOfSight
  const widgetLineOfSight = new LineOfSight({
      view: view
  });
  view.ui.add(new Expand({
      view: view,
      content: widgetLineOfSight,
      expandTooltip: "Análise de visada",
      expandIconClass: "esri-icon-line-of-sight"
  }), "top-right");

  // ElevationProfile
  const widgetElevationProfile = new ElevationProfile({
      view: view
  });
  view.ui.add(new Expand({
      view: view,
      content: widgetElevationProfile,
      expandTooltip: "Análise de elevação",
      expandIconClass: "esri-icon-elevation-profile"
  }), "top-right");

  /**********************************************
 * MAIN
 **********************************************/

  // Select street
  // Generate points
  // Add LIne of Sight along the line
  // 

  /**********************************************
 * MAIN
 **********************************************/

  // Add layer
  map.addMany(mapLayers);
});
