'use client'

import { DataGrid } from "@mui/x-data-grid";
import Skeleton from "@mui/material/Skeleton";
import React, { useEffect } from "react";
import axios from "axios";
import {
  VictoryLine,
  VictoryChart,
  VictoryAxis,
} from "victory";

const columns = [
  { field: "device_id", headerName: "Device ID", width: 130 },
  { field: "parameter", headerName: "Parameter", width: 300 },
  { field: "timestamp", headerName: "Timestamp", width: 230 },
  { field: "value", headerName: "Value", width: 200 },
  { field: "type", headerName: "Type", width: 130 },
];

export default function Home() {
  const [rawData, setRawData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState({});
  const [graphData, setgraphData] = React.useState([]);

  const get_prediction = async () => {
    setLoading(true);

    let result = await axios.get(
      "https://master-sensor-target-lqfbwlkw2a-uc.a.run.app/api/v1/core/process_request",
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    setRawData(JSON.parse(result.data.graph_data));

    setLoading(false);
  };

  const handleRowSelection = (selectionModel) => {
    try {
      // selectionModel contains the IDs of the selected rows
      // Here we assume single row selection, so we get the first selected row
      const selectedRowId = selectionModel[0];
      // Find the row object corresponding to the selected ID
      const row = rawData.find((row) => row.id === selectedRowId);

      console.log("Selected row  ", row);

      setSelectedRow(row);
    } catch (error) {
      console.log("Error ", error);
      setSelectedRow({});
    }
  };

  const createGraphData = () => {
    try {
      if (selectedRow !== null && selectedRow !== undefined) {
        const device = selectedRow.device_id;
        const parameter = selectedRow.parameter;
        const dtype = selectedRow.type;

        let intermediate = rawData.filter(
          (row) => row.device_id === device && row.parameter === parameter
        );

        intermediate.sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );

        let x_vals = intermediate.map((obj) => obj.timestamp);

        let y_vals = intermediate.map((obj) => obj.value);

        if (dtype === "numeric") {
          y_vals = y_vals.map((val) => parseFloat(val));
        }

        const mergedArray = [];

        for (let i = 0; i < y_vals.length; i++) {
          mergedArray.push({ y: y_vals[i], x: x_vals[i] });
        }

        // Grouping of text items to see if a bar type chart is possible
        if (dtype === "text") {
          let counts = {};
          y_vals.forEach((str) => {
            counts[str] = counts[str] ? counts[str] + 1 : 1;
          });

          let groupedResult = Object.keys(counts).map((str) => ({
            string: str,
            count: counts[str],
          }));
        }

        setgraphData(mergedArray);
      }
    } catch (error) {
      console.log("Graph data error ", error);
    }
  };

  useEffect(() => {
    get_prediction();
  }, []);

  useEffect(() => {
    createGraphData();
  }, [selectedRow]);

  return (
    <div className="bg-white p-20">
      {loading === true && (
        <Skeleton sx={{ height: 680 }} animation="wave" variant="rectangular" />
      )}
      {rawData.length > 0 && loading === false && (
        <div>
          <p className="font-semibold text-2xl pb-4 text-black">Sensor Data</p>

          <p className="py-4 text-black">
            (Select a row and a chart for that device ID and parameter will be
            attempted)
          </p>

          <DataGrid
            rows={rawData}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
            pageSizeOptions={[10, 25, 50]}
            onRowSelectionModelChange={(newRowSelectionModel) => {
              handleRowSelection(newRowSelectionModel);
            }}
            checkboxSelection
          />

          {(selectedRow !== null && selectedRow !== undefined
            ? String(Object.keys(selectedRow).length > 1)
            : false) && JSON.stringify(selectedRow) !== "{}"  && (
            <div className="py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-400 p-4">
                  Device ID
                  <br />
                  {selectedRow.device_id}
                </div>
                <div className="bg-gray-400 p-4">
                  Data type
                  <br />
                  {selectedRow.type}
                </div>
                <div className="bg-gray-400 p-4 overflow-scroll scrollbar-hide">
                  Parameter Name
                  <br />
                  {selectedRow.parameter}
                </div>
              </div>

              {selectedRow.type === "numeric" && (
                <VictoryChart>
                  <VictoryAxis
                    dependentAxis
                    style={{
                      grid: { stroke: "white", strokeWidth: 0.5 },
                    }}
                  />
                  <VictoryLine data={graphData} />
                  <VictoryAxis
                    fixLabelOverlap={true}
                    tickValues={[
                      Math.min(...graphData.map((d) => d.x)),
                      Math.max(...graphData.map((d) => d.x)),
                    ]}
                    tickFormat={() => ""}
                  />
                </VictoryChart>
              )}

              {selectedRow.type === "text" && (
                <div className="py-8 text-black">
                  <p>
                    This text based data is too disparate to showcase in a chart
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
