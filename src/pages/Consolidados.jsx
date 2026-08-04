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
        metaPlaneada: sumPlanned,
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

  // Extract active schools to show in the table/chart
  const activeSchools = useMemo(() => {
    const ids = new Set();
    statsByEscuela.forEach(row => {
      Object.keys(row.schools).forEach(schoolId => ids.add(schoolId));
    });
    
    return dependencias
      .filter(dep => ids.has(String(dep.id)))
      .sort((a, b) => a.nombre?.localeCompare(b.nombre));
  }, [statsByEscuela, dependencias]);

  const displayedSchools = useMemo(() => {
    if (selectedSchool === "all") return activeSchools;
    return activeSchools.filter(school => String(school.id) === selectedSchool);
  }, [activeSchools, selectedSchool]);

  // Chart dataset for View 1
  const chartDataDesafios = useMemo(() => {
    return statsByDesafio.map((d) => ({
      desafio: d.desafioNombre.length > 20 ? d.desafioNombre.substring(0, 20) + "..." : d.desafioNombre,
      ejecutado: d.metaEjecutadaNum,
    }));
  }, [statsByDesafio]);

  // Chart dataset for View 2
  const chartDataEscuelas = useMemo(() => {
    return statsByEscuela.map((row) => {
      const dataPoint = {
        desafio: row.desafioNombre,
      };
      displayedSchools.forEach(school => {
        const schoolData = row.schools[String(school.id)];
        dataPoint[`school_${school.id}`] = schoolData ? schoolData.metaEjecutadaNum : 0;
      });
      return dataPoint;
    });
  }, [statsByEscuela, displayedSchools]);

  const seriesEscuelas = useMemo(() => {
    return displayedSchools.map(school => ({
      dataKey: `school_${school.id}`,
      label: school.nombre || `Escuela ${school.id}`,
    }));
  }, [displayedSchools]);

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
                  <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "right" }}>Meta Planeada</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "right" }}>Meta Ejecutada</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "right" }}>Meta Ejecutada %</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "right" }}>Pendiente por ejecutar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statsByDesafio.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      No hay datos para mostrar en este año.
                    </TableCell>
                  </TableRow>
                ) : (
                  statsByDesafio.map((row) => (
                    <TableRow key={row.id_desafio} hover>
                      <TableCell sx={{ fontWeight: "medium" }}>{toText(row.desafioNombre)}</TableCell>
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
                  series={[{ dataKey: "ejecutado", label: "Meta Ejecutada %", color: "#3498db" }]}
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

      {viewType === "escuelas" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" sx={{ color: "#34495e" }}>Vista por Escuela</Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filtrar por Escuela</InputLabel>
              <Select
                value={selectedSchool}
                label="Filtrar por Escuela"
                onChange={(e) => setSelectedSchool(e.target.value)}
              >
                <MenuItem value="all">Todas las escuelas</MenuItem>
                {activeSchools.map((school) => (
                  <MenuItem key={school.id} value={String(school.id)}>
                    {school.nombre}
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
                  {displayedSchools.length > 0 ? (
                    displayedSchools.map((school) => (
                      <TableCell 
                        key={school.id} 
                        colSpan={3} 
                        align="center" 
                        sx={{ color: "white", fontWeight: "bold", borderRight: "1px solid rgba(224, 224, 224, 0.3)" }}
                      >
                        {school.nombre}
                      </TableCell>
                    ))
                  ) : (
                    <TableCell sx={{ color: "white" }}>-</TableCell>
                  )}
                </TableRow>
                <TableRow sx={{ backgroundColor: "#e2e8f0" }}>
                  {displayedSchools.map((school) => (
                    <React.Fragment key={school.id}>
                      <TableCell align="right" sx={{ fontWeight: "bold", borderLeft: "1px solid rgba(224, 224, 224, 0.3)" }}>M. Planeada</TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>M. Ejecutada %</TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold", borderRight: "1px solid rgba(224, 224, 224, 0.3)" }}>Pendiente</TableCell>
                    </React.Fragment>
                  ))}
                  {displayedSchools.length === 0 && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {statsByEscuela.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={1 + displayedSchools.length * 3} align="center" sx={{ py: 3 }}>
                      No hay datos para mostrar en este año y filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  statsByEscuela.map((row) => (
                    <TableRow key={row.id_desafio} hover>
                      <TableCell sx={{ fontWeight: "medium", borderRight: "1px solid rgba(224, 224, 224, 1)" }}>
                        {row.desafioNombre}
                      </TableCell>
                      {displayedSchools.map((school) => {
                        const schoolData = row.schools[String(school.id)];
                        if (!schoolData) {
                          return (
                            <React.Fragment key={school.id}>
                              <TableCell align="right" sx={{ borderLeft: "1px solid rgba(224, 224, 224, 1)" }}>-</TableCell>
                              <TableCell align="right">-</TableCell>
                              <TableCell align="right" sx={{ borderRight: "1px solid rgba(224, 224, 224, 1)" }}>-</TableCell>
                            </React.Fragment>
                          );
                        }
                        return (
                          <React.Fragment key={school.id}>
                            <TableCell align="right" sx={{ borderLeft: "1px solid rgba(224, 224, 224, 1)" }}>
                              {schoolData.metaPlaneada}
                            </TableCell>
                            <TableCell align="right">
                              <Box
                                sx={{
                                  display: "inline-block",
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  backgroundColor: schoolData.metaEjecutadaNum >= 90 ? "#d4edda" :
                                                  schoolData.metaEjecutadaNum >= 50 ? "#cce5ff" :
                                                  schoolData.metaEjecutadaNum >= 30 ? "#fff3cd" : "#f8d7da",
                                  color: schoolData.metaEjecutadaNum >= 90 ? "#155724" :
                                         schoolData.metaEjecutadaNum >= 50 ? "#004085" :
                                         schoolData.metaEjecutadaNum >= 30 ? "#856404" : "#721c24",
                                }}
                              >
                                {schoolData.metaEjecutadaStr}
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ borderRight: "1px solid rgba(224, 224, 224, 1)" }}>
                              {schoolData.pendienteStr}
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

          {chartDataEscuelas.length > 0 && seriesEscuelas.length > 0 && (
            <Paper sx={{ p: 3, boxShadow: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "bold", textAlign: "center" }}>
                Porcentaje de Ejecución por Desafío y Escuela
              </Typography>
              <Box sx={{ width: "100%", height: 500 }}>
                <BarChart
                  dataset={chartDataEscuelas}
                  xAxis={[{ scaleType: "band", dataKey: "desafio" }]}
                  yAxis={[{ min: 0, max: 100 }]}
                  series={seriesEscuelas}
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
        </Box>
      )}
    </Box>
  );
}

export default Consolidados;