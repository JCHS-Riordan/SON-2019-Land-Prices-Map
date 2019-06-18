var H = Highcharts
var counties = Highcharts.geojson(Highcharts.maps["countries/us/us-all-all-highres"])
//Deviating from the template for the next two lines to filter out the separator line b/t AK & HI
var lines = Highcharts.geojson(Highcharts.maps["countries/us/us-all-all-highres"],'mapline')
var states = lines.filter(function (shape) {
  return shape.properties['hc-group'] === '__border_lines__';
})

var sheetID = '1qLGKvnTsvVeesUdb2BKIofpbjej1rXztCMFcXnEQ-g8'
var range = 'Sheet1!A:L'

var chart_title = 'Residential Land Prices in Many Areas Have Risen Sharply Since 2012'
var legend_title_change = 'Change in Residential <br/>Land Price, 2012-2017<br/> (Percent)'
var legend_title_price = 'Median Residential <br/>Land Price per Acre <br/>(Dollars)'

var table_notes = 'Notes: Median land prices per acre are for land occupied by single-family homes. Dollar values are nominal. <br/> Source: JCHS tabulations of Federal Housing Finance Agency (FHFA), The Price of Residential Land for Counties, <br/>ZIP Codes, and Census Tracts in the United States.'

var export_filename = "Land Price Under Single Family Homes - Harvard JCHS - State of the Nation's Housing 2019"

var default_selection = 5

var categories = [],
    ref_data = [],
    selected_data = [],
    chart_options = {},
    chart = {},
    drilldown_chart = {}

var data_classes_change = [
  {to: 0},
  {from: 0,  to: 25},
  {from: 25, to: 50},
  {from: 50, to: 100},
  {from: 100}
]

var data_classes_price = [
  {from: 0,      to: 50000},
  {from: 50000,  to: 100000},
  {from: 100000, to: 200000},
  {from: 200000, to: 500000},
  {from: 500000}
]

/*~~~~~~~ Document ready function ~~~~~~~*/
$(document).ready(function() {
  //get Google sheet data
  $.get(H.JCHS.requestURL(sheetID, range), function(obj) {
    categories = obj.values[0]
    ref_data = obj.values.slice(1)
    
    //create the title, notes, and search box
    $('#chart_title').html(chart_title)
    $('#table_notes').html(table_notes)

    //create the chart
    createChart() 

  }) 
}) //end document.ready


function createChart() {

  selected_data = ref_data.map(function (x) {
    return [x[0], x[default_selection]] //return data in 2 columns, GEOID and the value to be mapped
  })

  /*~~~~~~~ Chart Options ~~~~~~~*/
  chart_options = {
    JCHS: {
      //drilldownFunction: drilldownChart
    },
    chart: {
      events: {
        load: function() {
          initUserInteraction()
        },
      },
    },

    legend: {
        title: {
          text: legend_title_change
        },
      labelFormatter: function () { //Formatting the legend to match style preferences
        if ((this.from == 0) & (this.to == 25)) { //legend entries w/ upper & lower bound
          return '0–24'
        } else if ((this.from == 25) & (this.to == 50)) { 
          return '25–49'
        } else if ((this.from == 50) & (this.to == 100)) { 
          return '50–99'
        } else if (this.to !=null) { //lowest legend entry
          return 'Decline'
        } else if (this.from != null) { //highest legend entry
          return '100 and Over'
        }
      }
    },

    colorAxis: {
      dataClasses: data_classes_change
    },
    series: [
      {
        type: 'map',
        name: categories[default_selection],
        mapData: counties,
        data: selected_data,
        joinBy: ["fips", 0],
        keys: ["fips", "value"]
        /*Had to add joinBy and keys lines to enable linking to county data,
        these lines weren't in the new template -RF 5/31/19*/
      }, {
        type: 'mapline',
        name: 'State borders',
        data: states,
      },
    ], //end series


    // Exporting options
    exporting: {
      filename: export_filename,
      JCHS: { sheetID: sheetID },
      chartOptions: {
        title: { text: chart_title},
      },            
      buttons: {
        contextButton: {
          menuItems: ['viewFullDataset']
        /*menuItems: ['viewFullDataset', 'separator', 'downloadPDF', 'separator', 'downloadPNG', 'downloadJPEG'] */
        } //end contextButtons
      } //end buttons 
    }, //end exporting
    
    tooltip: {
      formatter: function() {
        var point = this.point
        var series = this.series
        var user_selection = $('#user_input :checked').val()   
        
        var tooltip_text = ''
        tooltip_text +=  '<b>' +  point.name + '</b>'

        ref_data.forEach(function (row) {
          if (row[0] == point.fips) { //Changed 'GEOID' to 'fips' here -RF, 5/31/19
            switch (user_selection) {
              case '5':
                tooltip_text +=  '<br><i>Change in County Price per Acre, 2012-2017: </i><b>' + H.JCHS.numFormat(point.value, 1) + '%</b>'
                tooltip_text +=  '<br><br>County Price per Acre, 2012: <b>$' + H.JCHS.numFormat(row[3]) + '</b>'
                tooltip_text +=  '<br>County Price per Acre, 2017: <b>$' + H.JCHS.numFormat(row[4]) + '</b>'
                break
              case '3':
                tooltip_text +=  '<br><i>County Price per Acre, 2012: </i><b>$' + H.JCHS.numFormat(point.value) + '</b>'
                tooltip_text +=  '<br><br>County Price per Acre, 2017: <b>$' + H.JCHS.numFormat(row[4]) + '</b>'
                tooltip_text +=  '<br>Change in County Price per Acre, 2012-2017: <b>' + H.JCHS.numFormat(row[5]) + '%</b>'
                break
              case '4':
                tooltip_text +=  '<br><i>County Price per Acre, 2017: </i><b>$' + H.JCHS.numFormat(point.value) + '</b>'
                tooltip_text +=  '<br><br>County Price per Acre, 2012: <b>$' + H.JCHS.numFormat(row[3]) + '</b>'
                tooltip_text +=  '<br>Change in County Price per Acre, 2012-2017: <b>' + H.JCHS.numFormat(row[5]) + '%</b>'
                break
            } //Ending the switch, then adding common text for the tooltip over the next four lines, relating to metro areas -RF, 5/31/19
            tooltip_text +=  '<br><br>Corresponding Metropolitan Area: <b>' + (row[7]) + '</b>'
            tooltip_text += '<br>Metro Area Price per Acre, 2012: <b>$' + H.JCHS.numFormat(row[8]) + '</b>'
            tooltip_text += '<br>Metro Area Price per Acre, 2017: <b>$' + H.JCHS.numFormat(row[9]) + '</b>'
            tooltip_text += '<br>Change in Metro Area Price per Acre, 2012-2017: <b>' + H.JCHS.numFormat(row[10]) + '%</b>'      
          }
        })
        return tooltip_text
      }
    }
  } //end chart_options

  /*~~~~~~~ Create Chart ~~~~~~~*/
  chart = Highcharts.mapChart(
    'container',
    chart_options
  ) //end chart
  
} //end createChart()

/*~~~~~~~~~~~~~~ User interaction ~~~~~~~~~~~~~~~~~~~*/
function initUserInteraction () {
  $('#user_input').on('change', function () {
    var new_col = parseInt($('#user_input :checked').val())
    var new_data = ref_data.map(function (x) {
      return [x[0], x[new_col]]
    })
    chart.series[0].update({name: categories[new_col]})   
    chart.series[0].setData(new_data)
    //If/else loop for changing the data classes and legend for change/price -RF
    if($('#user_input :checked').val() < 5) { //Price 2012 val is 3, Price 2017 is 4
      chart.colorAxis[0].update({
        dataClasses: data_classes_price
      }),
        chart.legend.update({
        title: {
          text: legend_title_price
        },
        labelFormatter: function () {
          if ((this.from == 0) & (this.to == 50000)) { //legend entries w/ upper & lower bound
            return 'Less than $50,000'
          } else if ((this.from == 50000) & (this.to == 100000)) { 
            return '$50,000–$99,999'
          } else if ((this.from == 100000) & (this.to == 200000)) { 
            return '$100,000–$199,999'
          } else if ((this.from == 200000) & (this.to == 500000)) {
            return '$200,000–$499,999'
          } else if (this.from != null) { //highest legend entry
            return '$500,000 and Over'
          }
        }
      })
    } else {
      chart.colorAxis[0].update({
        dataClasses: data_classes_change
      }),
        chart.legend.update({
        title: {
          text: legend_title_change
        },
        labelFormatter: function () { //Have to redeclare the default formatter here
          if ((this.from == 0) & (this.to == 25)) { //legend entries w/ upper & lower bound
            return '0–24'
          } else if ((this.from == 25) & (this.to == 50)) { 
            return '25–49'
          } else if ((this.from == 50) & (this.to == 100)) { 
            return '50–99'
          } else if (this.to !=null) { //lowest legend entry
            return 'Decline'
          } else if (this.from != null) { //highest legend entry
            return '100 and Over'
          }
        }
      })
    }
  })
} //end initUserInteraction
