import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { Chart } from "react-google-charts";

// Helper functions (copied from Seguimientos logic)
const toText = (value) => String(value ?? "").trim() || "No disponible";
const normalize = (value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const parseSheetNumber = (value) => {
  if (value == "Sin registro") return "Sin registro";
  const text = String(value ?? "").trim();
  if (!text) return null;
  const normalized = text.replace("%", "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatExecutionPercent = (plannedValue, executedValue) => {
  const planned = parseSheetNumber(plannedValue);
  const executed = parseSheetNumber(executedValue);
  if (planned === null || executed === null || planned === 0) return "Sin registro";
  return `${((executed / planned) * 100).toFixed(1).replace(".", ",")}%`;
};

const sortById = (items) => [...items].sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));

const getSheet = (data, ...keys) => {
  for (const key of keys) {
    const value = data?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const buildYearKeys = (metas, avances) => {
  const keys = new Set();
  [...metas, ...avances].forEach((item) => {
    Object.keys(item || {}).forEach((key) => {
      const match = key.match(/^(meta|avance)_(\d{4})$/);
      if (match) keys.add(match[2]);
    });
  });
  return [...keys].sort((a, b) => Number(a) - Number(b));
};

const getSafeNumber = (val) => {
  const parsed = parseSheetNumber(val);
  return typeof parsed === "number" ? parsed : 0;
};

function Consolidados({ data, userInfo }) {
  useEffect(() => {
    document.title = "Consolidados";
  }, []);

  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [viewType, setViewType] = useState("desafios");
  const [selectedSchool, setSelectedSchool] = useState("all");
  const [selectedOficina, setSelectedOficina] = useState("all");

  const desafios = useMemo(() => sortById(getSheet(data, "DESAFIOS")), [data]);
  const indicators = useMemo(() => sortById(getSheet(data, "INDICADORES_PRODUCTO")), [data]);
  const metas = useMemo(() => sortById(getSheet(data, "METAS")), [data]);
  const avances = useMemo(() => sortById(getSheet(data, "AVANCES")), [data]);
  const dependencias = useMemo(() => sortById(getSheet(data, "DEPENDENCIA", "DEPENDENCIAS")), [data]);

  const desafioById = useMemo(() => new Map(desafios.map((item) => [String(item.id), item])), [desafios]);
  const metaByIndicatorId = useMemo(() => new Map(metas.map((item) => [String(item.id_indicador_producto), item])), [metas]);
  const avanceByIndicatorId = useMemo(() => new Map(avances.map((item) => [String(item.id_indicador), item])), [avances]);
  const dependenciaById = useMemo(() => new Map(dependencias.map((item) => [String(item.id), item])), [dependencias]);
  
  const availableYears = useMemo(() => buildYearKeys(metas, avances), [metas, avances]);

  useEffect(() => {
    if (!availableYears.length) return;
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // View 1: Aggregate data by Desafío (Vista por Desafíos)
  const statsByDesafio = useMemo(() => {
    // 1. Group indicators by normalized name to deduplicate them within the same Desafío (like in Seguimientos)
    const groupedByDesafio = new Map();
    
    indicators.forEach((indicator) => {
      const desafio = desafioById.get(String(indicator.id_desafio || ""));
      if (!desafio) return;

      const meta = metaByIndicatorId.get(String(indicator.id));
      const avance = avanceByIndicatorId.get(String(indicator.id));
      const metaValue = meta ? meta[`meta_${selectedYear}`] : null;
      const avanceValue = avance ? avance[`avance_${selectedYear}`] : null;
      
      if (metaValue == null && avanceValue == null) return;

      const existing = groupedByDesafio.get(String(desafio.id)) || {
        desafio,
        indicators: [],
      };

      const normalizedName = normalize(indicator.nombre);
      const existingInd = existing.indicators.find((i) => normalize(i.nombre) === normalizedName);

      if (existingInd) {
        const sumMeta = getSafeNumber(existingInd.metaValue) + getSafeNumber(metaValue);
        const sumAvance = getSafeNumber(existingInd.avanceValue) + getSafeNumber(avanceValue);
        existingInd.metaValue = sumMeta;
        existingInd.avanceValue = sumAvance;
      } else {
        existing.indicators.push({
          ...indicator,
          metaValue,
          avanceValue,
        });
      }

      groupedByDesafio.set(String(desafio.id), existing);
    });

    // 2. Now sum up all indicators for each Desafío to get the challenge total
    const result = [...groupedByDesafio.values()].map((group) => {
      let sumPlanned = 0;
      let sumExecuted = 0;
      
      group.indicators.forEach((ind) => {
        sumPlanned += getSafeNumber(ind.metaValue);
        sumExecuted += getSafeNumber(ind.avanceValue);
      });

      const execPercentStr = formatExecutionPercent(sumPlanned, sumExecuted);
      const execPercentNum = parseSheetNumber(execPercentStr) || 0;
      
      // Calculate pending, minimum 0
      const pendingPercent = Math.max(0, 100 - execPercentNum);

      return {
        id_desafio: group.desafio.id,
        desafioNombre: group.desafio.titulo || `Desafío ${group.desafio.id}`,
        numIndicadores: group.indicators.length,
        metaPlaneada: sumPlanned,
        metaEjecutada: sumExecuted,
        metaEjecutadaStr: execPercentStr,
        metaEjecutadaNum: execPercentNum,
        pendienteNum: pendingPercent,
        pendienteStr: pendingPercent > 0 ? `${pendingPercent.toFixed(1).replace(".", ",")}%` : "0%",
      };
    });

    return result.sort((a, b) => Number(a.id_desafio) - Number(b.id_desafio));
  }, [indicators, desafioById, metaByIndicatorId, avanceByIndicatorId, selectedYear]);

  // View 2: Aggregate data by Desafío AND Dependencia (Vista por Escuela)
  const statsByEscuela = useMemo(() => {
    // 1. Group indicators by normalized name to deduplicate them within the same Desafío AND Dependencia
    const grouped = new Map();
    
    indicators.forEach((indicator) => {
      const idDesafio = String(indicator.id_desafio || "");
      const idDependencia = String(indicator.id_dependencia || "");
      
      const desafio = desafioById.get(idDesafio);
      const dependencia = dependenciaById.get(idDependencia);
      
      if (!desafio || !dependencia) return;

      const meta = metaByIndicatorId.get(String(indicator.id));
      const avance = avanceByIndicatorId.get(String(indicator.id));
      const metaValue = meta ? meta[`meta_${selectedYear}`] : null;
      const avanceValue = avance ? avance[`avance_${selectedYear}`] : null;
      
      if (metaValue == null && avanceValue == null) return;

      const key = `${idDesafio}_${idDependencia}`;
      const existing = grouped.get(key) || {
        id_desafio: idDesafio,
        desafio,
        id_dependencia: idDependencia,
        dependencia,
        indicators: [],
        rawCount: 0,
      };

      existing.rawCount += 1;

      const normalizedName = normalize(indicator.nombre);
      const existingInd = existing.indicators.find((i) => normalize(i.nombre) === normalizedName);

      if (existingInd) {
        const sumMeta = getSafeNumber(existingInd.metaValue) + getSafeNumber(metaValue);
        const sumAvance = getSafeNumber(existingInd.avanceValue) + getSafeNumber(avanceValue);
        existingInd.metaValue = sumMeta;
        existingInd.avanceValue = sumAvance;
      } else {
        existing.indicators.push({
          ...indicator,
          metaValue,
          avanceValue,
        });
      }

      grouped.set(key, existing);
    });

    // 2. Sum up all indicators for each Desafío-Dependencia pair
    const aggregated = [...grouped.values()].map((group) => {
      let sumPlanned = 0;
      let sumExecuted = 0;
      
      group.indicators.forEach((ind) => {
        sumPlanned += getSafeNumber(ind.metaValue);
        sumExecuted += getSafeNumber(ind.avanceValue);
      });

      const execPercentStr = formatExecutionPercent(sumPlanned, sumExecuted);
      const execPercentNum = parseSheetNumber(execPercentStr) || 0;
      const pendingPercent = Math.max(0, 100 - execPercentNum);

      return {
        id_desafio: group.id_desafio,
        id_dependencia: group.id_dependencia,
        desafioNombre: `Desafío ${group.id_desafio}`,
        escuelaNombre: group.dependencia.nombre || `Escuela ${group.id_dependencia}`,
        numIndicadores: group.rawCount,
        metaPlaneada: sumPlanned,
        metaEjecutada: sumExecuted,
        metaEjecutadaStr: execPercentStr,
        metaEjecutadaNum: execPercentNum,
        pendienteStr: pendingPercent > 0 ? `${pendingPercent.toFixed(1).replace(".", ",")}%` : "0%",
      };
    });

    // Reorganize as an array of rows (one row per Desafío)
    const rowsMap = new Map();
    aggregated.forEach((item) => {
      let row = rowsMap.get(item.id_desafio);
      if (!row) {
        row = {
          id_desafio: item.id_desafio,
          desafioNombre: item.desafioNombre,
          schools: {},
        };
        rowsMap.set(item.id_desafio, row);
      }
      row.schools[item.id_dependencia] = item;
    });

    return [...rowsMap.values()].sort((a, b) => Number(a.id_desafio) - Number(b.id_desafio));
  }, [indicators, desafioById, dependenciaById, metaByIndicatorId, avanceByIndicatorId, selectedYear]);

  // Extract active dependencias
  const allActiveDependencias = useMemo(() => {
    const ids = new Set();
    statsByEscuela.forEach(row => {
      Object.keys(row.schools).forEach(schoolId => ids.add(schoolId));
    });
    
    return dependencias
      .filter(dep => ids.has(String(dep.id)))
      .sort((a, b) => a.nombre?.localeCompare(b.nombre));
  }, [statsByEscuela, dependencias]);

  const activeSchools = useMemo(() => {
    return allActiveDependencias.filter(dep => String(dep.tipo || "").trim().toLowerCase() !== "oficina");
  }, [allActiveDependencias]);

  const activeOficinas = useMemo(() => {
    return allActiveDependencias.filter(dep => String(dep.tipo || "").trim().toLowerCase() === "oficina");
  }, [allActiveDependencias]);

  const activeItems = viewType === "oficinas" ? activeOficinas : activeSchools;
  const selectedItem = viewType === "oficinas" ? selectedOficina : selectedSchool;
  const setSelectedItem = viewType === "oficinas" ? setSelectedOficina : setSelectedSchool;
  const titleLabel = viewType === "oficinas" ? "Oficina" : "Escuela";

  const displayedItems = useMemo(() => {
    if (selectedItem === "all") return activeItems;
    return activeItems.filter(item => String(item.id) === selectedItem);
  }, [activeItems, selectedItem]);

  // Chart dataset for View 1
  const chartDataDesafios = useMemo(() => {
    return statsByDesafio.map((d) => ({
      desafio: d.desafioNombre.length > 20 ? d.desafioNombre.substring(0, 20) + "..." : d.desafioNombre,
      ejecutado: d.metaEjecutadaNum,
    }));
  }, [statsByDesafio]);

  // Chart dataset for View 2 & 3
  const chartDataItems = useMemo(() => {
    return statsByEscuela.map((row) => {
      const dataPoint = {
        desafio: row.desafioNombre,
      };
      displayedItems.forEach(item => {
        const itemData = row.schools[String(item.id)];
        dataPoint[`item_${item.id}`] = itemData ? itemData.metaEjecutadaNum : 0;
      });
      return dataPoint;
    });
  }, [statsByEscuela, displayedItems]);

  const seriesItems = useMemo(() => {
    return displayedItems.map(item => ({
      dataKey: `item_${item.id}`,
      label: item.nombre || `${titleLabel} ${item.id}`,
    }));
  }, [displayedItems, titleLabel]);

  const itemTotals = useMemo(() => {
    const totals = displayedItems.map(item => {
      let numIndicadores = 0;
      let metaPlaneada = 0;
      let metaEjecutada = 0;

      statsByEscuela.forEach(row => {
        const itemData = row.schools[String(item.id)];
        if (itemData) {
          numIndicadores += itemData.numIndicadores;
          metaPlaneada += itemData.metaPlaneada;
          metaEjecutada += itemData.metaEjecutada;
        }
      });

      const execPercentStr = formatExecutionPercent(metaPlaneada, metaEjecutada);
      const execPercentNum = parseSheetNumber(execPercentStr) || 0;

      return {
        id: item.id,
        nombre: item.nombre,
        numIndicadores,
        metaPlaneada,
        metaEjecutada,
        execPercentStr,
        execPercentNum
      };
    });

    return totals;
  }, [displayedItems, statsByEscuela]);

  const globalTotals = useMemo(() => {
    let totalIndicadores = 0;
    let totalPlaneada = 0;
    let totalEjecutada = 0;

    itemTotals.forEach(item => {
      totalIndicadores += item.numIndicadores;
      totalPlaneada += item.metaPlaneada;
      totalEjecutada += item.metaEjecutada;
    });
    
    const execPercentStr = formatExecutionPercent(totalPlaneada, totalEjecutada);
    const execPercentNum = parseSheetNumber(execPercentStr) || 0;

    return {
      totalIndicadores,
      execPercentStr,
      execPercentNum
    };
  }, [itemTotals]);

  const pieChartDataIndicadores = useMemo(() => {
    return [
      [titleLabel, "Número de Indicadores"],
      ...itemTotals.map(item => [item.nombre, item.numIndicadores])
    ];
  }, [itemTotals, titleLabel]);

  const pieChartDataEjecucion = useMemo(() => {
    return [
      [titleLabel, "Porcentaje de Ejecución"],
      ...itemTotals.map(item => [item.nombre, item.execPercentNum])
    ];
  }, [itemTotals, titleLabel]);

  const pieChartOptionsEjecucion = useMemo(() => {
    const slices = {};
    itemTotals.forEach((item, index) => {
      const offsetValue = Math.min(Math.max(item.execPercentNum / 250, 0), 0.6); 
      slices[index] = { offset: offsetValue }; 
    });
    return {
      title: `Porcentaje de Ejecución por ${titleLabel}`,
      is3D: false,
      pieHole: 0.2,
      slices: slices,
      legend: { position: "right", alignment: "center" }
    };
  }, [itemTotals, titleLabel]);

  return (
    <Box sx={{ padding: "20px" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "#2c3e50" }}>
          Consolidados
        </Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          <ToggleButtonGroup
            value={viewType}
            exclusive
            onChange={(e, newValue) => {
              if (newValue !== null) setViewType(newValue);
            }}
            size="small"
            color="primary"
          >
            <ToggleButton value="desafios">Por Desafíos</ToggleButton>
            <ToggleButton value="escuelas">Por Escuela</ToggleButton>
            <ToggleButton value="oficinas">Por Oficina</ToggleButton>
          </ToggleButtonGroup>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Año</InputLabel>
            <Select
              value={selectedYear}
              label="Año"
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {availableYears.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {viewType === "desafios" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Typography variant="h6" sx={{ color: "#34495e" }}>Vista por Desafíos</Typography>

          <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#34495e" }}>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>Desafíos</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "right" }}>N.º indicadores</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "right" }}>Meta Planeada</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "right" }}>Meta Ejecutada</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "right" }}>Porcentaje ejecutado</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "right" }}>Pendiente por ejecutar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statsByDesafio.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      No hay datos para mostrar en este año.
                    </TableCell>
                  </TableRow>
                ) : (
                  statsByDesafio.map((row) => (
                    <TableRow key={row.id_desafio} hover>
                      <TableCell sx={{ fontWeight: "medium" }}>{toText(row.desafioNombre)}</TableCell>
                      <TableCell align="right">{row.numIndicadores}</TableCell>
                      <TableCell align="right">{row.metaPlaneada}</TableCell>
                      <TableCell align="right">{row.metaEjecutada}</TableCell>
                      <TableCell align="right">
                        <Box
                          sx={{
                            display: "inline-block",
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            backgroundColor: row.metaEjecutadaNum >= 90 ? "#d4edda" :
                                            row.metaEjecutadaNum >= 50 ? "#cce5ff" :
                                            row.metaEjecutadaNum >= 30 ? "#fff3cd" : "#f8d7da",
                            color: row.metaEjecutadaNum >= 90 ? "#155724" :
                                   row.metaEjecutadaNum >= 50 ? "#004085" :
                                   row.metaEjecutadaNum >= 30 ? "#856404" : "#721c24",
                          }}
                        >
                          {row.metaEjecutadaStr}
                        </Box>
                      </TableCell>
                      <TableCell align="right">{row.pendienteStr}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {chartDataDesafios.length > 0 && (
            <Paper sx={{ p: 3, boxShadow: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "bold", textAlign: "center" }}>
                Porcentaje de Ejecución por Desafío
              </Typography>
              <Box sx={{ width: "100%", height: 400 }}>
                <BarChart
                  dataset={chartDataDesafios}
                  xAxis={[{ scaleType: "band", dataKey: "desafio" }]}
                  yAxis={[{ min: 0, max: 100 }]}
                  series={[{ dataKey: "ejecutado", label: "Porcentaje ejecutado", color: "#3498db" }]}
                  margin={{ top: 20, bottom: 80, left: 50, right: 20 }}
                  slotProps={{
                    legend: {
                      position: { vertical: 'top', horizontal: 'middle' }
                    }
                  }}
                />
              </Box>
            </Paper>
          )}
        </Box>
      )}

      {(viewType === "escuelas" || viewType === "oficinas") && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" sx={{ color: "#34495e" }}>Vista por {titleLabel}</Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filtrar por {titleLabel}</InputLabel>
              <Select
                value={selectedItem}
                label={`Filtrar por ${titleLabel}`}
                onChange={(e) => setSelectedItem(e.target.value)}
              >
                <MenuItem value="all">Todas las {viewType}</MenuItem>
                {activeItems.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {item.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2, overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#34495e" }}>
                  <TableCell rowSpan={2} sx={{ color: "white", fontWeight: "bold", borderRight: "1px solid rgba(224, 224, 224, 0.3)" }}>
                    Desafíos 
                  </TableCell>
                  {displayedItems.length > 0 ? (
                    displayedItems.map((item) => (
                      <TableCell 
                        key={item.id} 
                        colSpan={3} 
                        align="center" 
                        sx={{ color: "white", fontWeight: "bold", borderRight: "1px solid rgba(224, 224, 224, 0.3)" }}
                      >
                        {item.nombre}
                      </TableCell>
                    ))
                  ) : (
                    <TableCell sx={{ color: "white" }}>-</TableCell>
                  )}
                </TableRow>
                <TableRow sx={{ backgroundColor: "#e2e8f0" }}>
                  {displayedItems.map((item) => (
                    <React.Fragment key={item.id}>
                      <TableCell align="right" sx={{ fontWeight: "bold", borderLeft: "1px solid rgba(224, 224, 224, 0.3)" }}>N.º indicadores</TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>M. Ejecutada %</TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold", borderRight: "1px solid rgba(224, 224, 224, 0.3)" }}>Pendiente</TableCell>
                    </React.Fragment>
                  ))}
                  {displayedItems.length === 0 && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {statsByEscuela.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={1 + displayedItems.length * 3} align="center" sx={{ py: 3 }}>
                      No hay datos para mostrar en este año y filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  statsByEscuela.map((row) => (
                    <TableRow key={row.id_desafio} hover>
                      <TableCell align="left" sx={{ fontWeight: "medium" }}>
                        {row.desafioNombre}
                      </TableCell>
                      {displayedItems.map((item) => {
                        const itemData = row.schools[String(item.id)];
                        if (!itemData) {
                          return (
                            <React.Fragment key={item.id}>
                              <TableCell align="right" sx={{ borderLeft: "1px solid rgba(224, 224, 224, 1)" }}>-</TableCell>
                              <TableCell align="right">-</TableCell>
                              <TableCell align="right" sx={{ borderRight: "1px solid rgba(224, 224, 224, 1)" }}>-</TableCell>
                            </React.Fragment>
                          );
                        }
                        return (
                          <React.Fragment key={item.id}>
                            <TableCell align="right" sx={{ borderLeft: "1px solid rgba(224, 224, 224, 1)" }}>
                              {itemData.numIndicadores}
                            </TableCell>
                            <TableCell align="right">
                              <Box
                                sx={{
                                  display: "inline-block",
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  backgroundColor: itemData.metaEjecutadaNum >= 90 ? "#d4edda" :
                                                  itemData.metaEjecutadaNum >= 50 ? "#cce5ff" :
                                                  itemData.metaEjecutadaNum >= 30 ? "#fff3cd" : "#f8d7da",
                                  color: itemData.metaEjecutadaNum >= 90 ? "#155724" :
                                         itemData.metaEjecutadaNum >= 50 ? "#004085" :
                                         itemData.metaEjecutadaNum >= 30 ? "#856404" : "#721c24",
                                }}
                              >
                                {itemData.metaEjecutadaStr}
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ borderRight: "1px solid rgba(224, 224, 224, 1)" }}>
                              {itemData.pendienteStr}
                            </TableCell>
                          </React.Fragment>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {chartDataItems.length > 0 && seriesItems.length > 0 && (
            <Paper sx={{ p: 3, boxShadow: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "bold", textAlign: "center" }}>
                Porcentaje de Ejecución por Desafío y {titleLabel}
              </Typography>
              <Box sx={{ width: "100%", height: 500 }}>
                <BarChart
                  dataset={chartDataItems}
                  xAxis={[{ scaleType: "band", dataKey: "desafio" }]}
                  yAxis={[{ min: 0, max: 100 }]}
                  series={seriesItems}
                  margin={{ top: 80, bottom: 80, left: 50, right: 20 }}
                  slotProps={{
                    legend: {
                      position: { vertical: 'top', horizontal: 'middle' },
                      itemMarkWidth: 10,
                      itemMarkHeight: 10,
                      labelStyle: { fontSize: 12 },
                      padding: 10,
                    }
                  }}
                />
              </Box>
            </Paper>
          )}

          {itemTotals.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Typography variant="h6" sx={{ color: "#34495e" }}>Resumen Total por {titleLabel}</Typography>
              <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#34495e" }}>
                      <TableCell sx={{ color: "white", fontWeight: "bold" }}>{titleLabel}</TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "right" }}>N.º indicadores</TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "right" }}>Porcentaje de ejecución</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {itemTotals.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ fontWeight: "medium" }}>{row.nombre}</TableCell>
                        <TableCell align="right">{row.numIndicadores}</TableCell>
                        <TableCell align="right">
                          <Box
                            sx={{
                              display: "inline-block",
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              backgroundColor: row.execPercentNum >= 90 ? "#d4edda" :
                                              row.execPercentNum >= 50 ? "#cce5ff" :
                                              row.execPercentNum >= 30 ? "#fff3cd" : "#f8d7da",
                              color: row.execPercentNum >= 90 ? "#155724" :
                                     row.execPercentNum >= 50 ? "#004085" :
                                     row.execPercentNum >= 30 ? "#856404" : "#721c24",
                            }}
                          >
                            {row.execPercentStr}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ backgroundColor: "#f8f9fa" }}>
                      <TableCell sx={{ fontWeight: "bold" }}>TOTAL</TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>{globalTotals.totalIndicadores}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>
                        <Box
                          sx={{
                            display: "inline-block",
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            backgroundColor: globalTotals.execPercentNum >= 90 ? "#d4edda" :
                                            globalTotals.execPercentNum >= 50 ? "#cce5ff" :
                                            globalTotals.execPercentNum >= 30 ? "#fff3cd" : "#f8d7da",
                            color: globalTotals.execPercentNum >= 90 ? "#155724" :
                                   globalTotals.execPercentNum >= 50 ? "#004085" :
                                   globalTotals.execPercentNum >= 30 ? "#856404" : "#721c24",
                          }}
                        >
                          {globalTotals.execPercentStr}
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                <Paper sx={{ p: 2, boxShadow: 3, borderRadius: 2, flex: "1 1 45%", minWidth: "300px" }}>
                  <Chart
                    chartType="PieChart"
                    data={pieChartDataIndicadores}
                    options={{ title: `Número de Indicadores por ${titleLabel}`, is3D: true, legend: { position: "right", alignment: "center" } }}
                    width={"100%"}
                    height={"400px"}
                  />
                </Paper>
                <Paper sx={{ p: 2, boxShadow: 3, borderRadius: 2, flex: "1 1 45%", minWidth: "300px" }}>
                  <Chart
                    chartType="PieChart"
                    data={pieChartDataEjecucion}
                    options={pieChartOptionsEjecucion}
                    width={"100%"}
                    height={"400px"}
                  />
                </Paper>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

export default Consolidados;