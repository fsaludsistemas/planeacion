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
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { Chart } from "react-google-charts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../styles/seguimientos.css";

// Helper functions (copied from Seguimientos logic)
const toText = (value) => String(value ?? "").trim() || "No disponible";
const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

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
  if (planned === null || executed === null || planned === 0)
    return "Sin registro";
  let percent = (executed / planned) * 100;
  if (percent > 100) percent = 100;
  return `${percent.toFixed(1).replace(".", ",")}%`;
};

const sortById = (items) =>
  [...items].sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));

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

const hasYearValue = (value) => {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text !== "" && text.toLowerCase() !== "sin registro";
};

const isPrivilegedRole = (role) => {
  const value = normalize(role);
  return value === "administrador" || value === "sistemas" || value === "0";
};

const percentageClass = (value) => {
  const number = parseSheetNumber(value);
  if (number >= 90) return "lightgreen";
  if (number >= 50) return "lightblue";
  if (number >= 30) return "yellow";
  if (number >= 0) return "salmon";
  return "transparent";
};

function Consolidados({ data, userInfo }) {
  useEffect(() => {
    document.title = "Consolidados";
  }, []);

  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear()),
  );
  const [viewType, setViewType] = useState("resumen");
  const [selectedSchool, setSelectedSchool] = useState("all");
  const [selectedOficina, setSelectedOficina] = useState("all");
  const [selectedDependency, setSelectedDependency] = useState("");
  const [selectedTipoDependencia, setSelectedTipoDependencia] = useState("");
  const [selectedDesafio, setSelectedDesafio] = useState("");
  const [selectedRespondeA, setSelectedRespondeA] = useState("");
  const [selectedConvergente, setSelectedConvergente] = useState("");
  const [selectedFacultad, setSelectedFacultad] = useState("");
  const [selectedPrograma, setSelectedPrograma] = useState("");
  const [selectedResultado, setSelectedResultado] = useState("");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  const sessionUser = useMemo(() => {
    if (userInfo) return userInfo;
    try {
      const stored = sessionStorage.getItem("loggedUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [userInfo]);
  const userRole = normalize(sessionUser?.rol || sessionUser?.permiso);
  const userDependencyId = String(sessionUser?.id_dependencia || "").trim();
  const canSeeAll = isPrivilegedRole(userRole);
  const canSeeAllConsolidatedViews = canSeeAll;

  const desafios = useMemo(() => sortById(getSheet(data, "DESAFIOS")), [data]);
  const indicators = useMemo(
    () => sortById(getSheet(data, "INDICADORES_PRODUCTO")),
    [data],
  );
  const metas = useMemo(() => sortById(getSheet(data, "METAS")), [data]);
  const avances = useMemo(() => sortById(getSheet(data, "AVANCES")), [data]);
  const dependencias = useMemo(
    () => sortById(getSheet(data, "DEPENDENCIA", "DEPENDENCIAS")),
    [data],
  );

  const desafioById = useMemo(
    () => new Map(desafios.map((item) => [String(item.id), item])),
    [desafios],
  );
  const metaByIndicatorId = useMemo(
    () =>
      new Map(metas.map((item) => [String(item.id_indicador_producto), item])),
    [metas],
  );
  const avanceByIndicatorId = useMemo(
    () => new Map(avances.map((item) => [String(item.id_indicador), item])),
    [avances],
  );
  const dependenciaById = useMemo(
    () => new Map(dependencias.map((item) => [String(item.id), item])),
    [dependencias],
  );
  const respondeAs = useMemo(
    () => sortById(getSheet(data, "RESPONDE_A")),
    [data],
  );
  const respondeAById = useMemo(
    () => new Map(respondeAs.map((item) => [String(item.id), item])),
    [respondeAs],
  );
  const convergentes = useMemo(
    () => sortById(getSheet(data, "ESTRATEGIA_CONVERGENTE")),
    [data],
  );
  const facultades = useMemo(
    () => sortById(getSheet(data, "ESTRATEGIA_FACULTAD")),
    [data],
  );
  const programas = useMemo(
    () => sortById(getSheet(data, "PROGRAMAS_INST")),
    [data],
  );
  const resultados = useMemo(
    () => sortById(getSheet(data, "INDICADORES_RESULTADO")),
    [data],
  );

  useEffect(() => {
    if (!canSeeAll && userDependencyId) setSelectedDependency(userDependencyId);
  }, [canSeeAll, userDependencyId]);

  const filteredIndicators = useMemo(
    () =>
      indicators.filter((indicator) => {
        if (
          !canSeeAll &&
          userDependencyId &&
          String(indicator.id_dependencia || "") !== userDependencyId
        )
          return false;
        if (
          selectedDependency &&
          String(indicator.id_dependencia || "") !== selectedDependency
        )
          return false;
        if (
          selectedDesafio &&
          String(indicator.id_desafio || "") !== selectedDesafio
        )
          return false;
        if (
          selectedConvergente &&
          String(indicator.id_estrategia_convergente || "") !==
            selectedConvergente
        )
          return false;
        if (
          selectedFacultad &&
          String(indicator.id_estrategia_facultad || "") !== selectedFacultad
        )
          return false;
        if (
          selectedPrograma &&
          String(indicator.id_programa_inst || "") !== selectedPrograma
        )
          return false;
        if (
          selectedResultado &&
          String(indicator.id_indicador_resultado || "") !== selectedResultado
        )
          return false;
        if (
          selectedTipoDependencia &&
          normalize(
            dependenciaById.get(String(indicator.id_dependencia))?.tipo,
          ) !== normalize(selectedTipoDependencia)
        )
          return false;
        if (
          selectedRespondeA &&
          normalize(
            respondeAById.get(String(indicator.id_responde_a))?.nombre,
          ) !== normalize(selectedRespondeA)
        )
          return false;
        return true;
      }),
    [
      indicators,
      canSeeAll,
      userDependencyId,
      selectedDependency,
      selectedDesafio,
      selectedConvergente,
      selectedFacultad,
      selectedPrograma,
      selectedResultado,
      selectedTipoDependencia,
      selectedRespondeA,
      dependenciaById,
      respondeAById,
    ],
  );

  const availableYears = useMemo(
    () => buildYearKeys(metas, avances),
    [metas, avances],
  );

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

    filteredIndicators.forEach((indicator) => {
      const desafio = desafioById.get(String(indicator.id_desafio || ""));
      if (!desafio) return;

      const meta = metaByIndicatorId.get(String(indicator.id));
      const avance = avanceByIndicatorId.get(String(indicator.id));
      const metaValue = meta ? meta[`meta_${selectedYear}`] : null;
      const avanceValue = avance ? avance[`avance_${selectedYear}`] : null;

      if (!hasYearValue(metaValue) && !hasYearValue(avanceValue)) return;

      const existing = groupedByDesafio.get(String(desafio.id)) || {
        desafio,
        indicators: [],
      };

      const normalizedName = normalize(indicator.nombre);
      const existingInd = existing.indicators.find(
        (i) => normalize(i.nombre) === normalizedName,
      );

      if (existingInd) {
        const sumMeta =
          getSafeNumber(existingInd.metaValue) + getSafeNumber(metaValue);
        const sumAvance =
          getSafeNumber(existingInd.avanceValue) + getSafeNumber(avanceValue);
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
        pendienteStr:
          pendingPercent > 0
            ? `${pendingPercent.toFixed(1).replace(".", ",")}%`
            : "0%",
      };
    });

    return result.sort((a, b) => Number(a.id_desafio) - Number(b.id_desafio));
  }, [
    filteredIndicators,
    desafioById,
    metaByIndicatorId,
    avanceByIndicatorId,
    selectedYear,
  ]);

  const totalSummaryIndicators = useMemo(
    () => statsByDesafio.reduce((total, row) => total + row.numIndicadores, 0),
    [statsByDesafio],
  );

  // View 2: Aggregate data by Desafío AND Dependencia (Vista por Escuela)
  const statsByEscuela = useMemo(() => {
    // 1. Group indicators by normalized name to deduplicate them within the same Desafío AND Dependencia
    const grouped = new Map();

    filteredIndicators.forEach((indicator) => {
      const idDesafio = String(indicator.id_desafio || "");
      const idDependencia = String(indicator.id_dependencia || "");

      const desafio = desafioById.get(idDesafio);
      const dependencia = dependenciaById.get(idDependencia);

      if (!desafio || !dependencia) return;

      const meta = metaByIndicatorId.get(String(indicator.id));
      const avance = avanceByIndicatorId.get(String(indicator.id));
      const metaValue = meta ? meta[`meta_${selectedYear}`] : null;
      const avanceValue = avance ? avance[`avance_${selectedYear}`] : null;

      if (!hasYearValue(metaValue) && !hasYearValue(avanceValue)) return;

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
      const existingInd = existing.indicators.find(
        (i) => normalize(i.nombre) === normalizedName,
      );

      if (existingInd) {
        const sumMeta =
          getSafeNumber(existingInd.metaValue) + getSafeNumber(metaValue);
        const sumAvance =
          getSafeNumber(existingInd.avanceValue) + getSafeNumber(avanceValue);
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
        escuelaNombre:
          group.dependencia.nombre || `Escuela ${group.id_dependencia}`,
        numIndicadores: group.rawCount,
        metaPlaneada: sumPlanned,
        metaEjecutada: sumExecuted,
        metaEjecutadaStr: execPercentStr,
        metaEjecutadaNum: execPercentNum,
        pendienteStr:
          pendingPercent > 0
            ? `${pendingPercent.toFixed(1).replace(".", ",")}%`
            : "0%",
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

    return [...rowsMap.values()].sort(
      (a, b) => Number(a.id_desafio) - Number(b.id_desafio),
    );
  }, [
    filteredIndicators,
    desafioById,
    dependenciaById,
    metaByIndicatorId,
    avanceByIndicatorId,
    selectedYear,
  ]);

  // Extract active dependencias
  const allActiveDependencias = useMemo(() => {
    const ids = new Set();
    statsByEscuela.forEach((row) => {
      Object.keys(row.schools).forEach((schoolId) => ids.add(schoolId));
    });

    return dependencias
      .filter((dep) => ids.has(String(dep.id)))
      .sort((a, b) => a.nombre?.localeCompare(b.nombre));
  }, [statsByEscuela, dependencias]);

  const activeSchools = useMemo(() => {
    return allActiveDependencias.filter(
      (dep) =>
        String(dep.tipo || "")
          .trim()
          .toLowerCase() !== "oficina",
    );
  }, [allActiveDependencias]);

  const activeOficinas = useMemo(() => {
    return allActiveDependencias.filter(
      (dep) =>
        String(dep.tipo || "")
          .trim()
          .toLowerCase() === "oficina",
    );
  }, [allActiveDependencias]);

  const activeItems = viewType === "oficinas" ? activeOficinas : activeSchools;
  const selectedItem =
    viewType === "oficinas" ? selectedOficina : selectedSchool;
  const setSelectedItem =
    viewType === "oficinas" ? setSelectedOficina : setSelectedSchool;
  const titleLabel = viewType === "oficinas" ? "Oficina" : "Escuela";

  const displayedItems = useMemo(() => {
    if (selectedItem === "all") return activeItems;
    return activeItems.filter((item) => String(item.id) === selectedItem);
  }, [activeItems, selectedItem]);

  // Chart dataset for View 1
  const chartDataDesafios = useMemo(() => {
    return statsByDesafio.map((d) => ({
      desafio:
        d.desafioNombre.length > 20
          ? d.desafioNombre.substring(0, 20) + "..."
          : d.desafioNombre,
      ejecutado: d.metaEjecutadaNum,
    }));
  }, [statsByDesafio]);

  // Chart dataset for View 2 & 3
  const chartDataItems = useMemo(() => {
    return statsByEscuela.map((row) => {
      const dataPoint = {
        desafio: row.desafioNombre,
      };
      displayedItems.forEach((item) => {
        const itemData = row.schools[String(item.id)];
        dataPoint[`item_${item.id}`] = itemData ? itemData.metaEjecutadaNum : 0;
      });
      return dataPoint;
    });
  }, [statsByEscuela, displayedItems]);

  const seriesItems = useMemo(() => {
    return displayedItems.map((item) => ({
      dataKey: `item_${item.id}`,
      label: item.nombre || `${titleLabel} ${item.id}`,
      valueFormatter: (v) => (v != null ? `${v}%` : ""),
    }));
  }, [displayedItems, titleLabel]);

  const itemTotals = useMemo(() => {
    const totals = displayedItems.map((item) => {
      let numIndicadores = 0;
      let metaPlaneada = 0;
      let metaEjecutada = 0;

      statsByEscuela.forEach((row) => {
        const itemData = row.schools[String(item.id)];
        if (itemData) {
          numIndicadores += itemData.numIndicadores;
          metaPlaneada += itemData.metaPlaneada;
          metaEjecutada += itemData.metaEjecutada;
        }
      });

      const execPercentStr = formatExecutionPercent(
        metaPlaneada,
        metaEjecutada,
      );
      const execPercentNum = parseSheetNumber(execPercentStr) || 0;

      return {
        id: item.id,
        nombre: item.nombre,
        numIndicadores,
        metaPlaneada,
        metaEjecutada,
        execPercentStr,
        execPercentNum,
      };
    });

    return totals;
  }, [displayedItems, statsByEscuela]);

  const globalTotals = useMemo(() => {
    let totalIndicadores = 0;
    let totalPlaneada = 0;
    let totalEjecutada = 0;

    itemTotals.forEach((item) => {
      totalIndicadores += item.numIndicadores;
      totalPlaneada += item.metaPlaneada;
      totalEjecutada += item.metaEjecutada;
    });

    const execPercentStr = formatExecutionPercent(
      totalPlaneada,
      totalEjecutada,
    );
    const execPercentNum = parseSheetNumber(execPercentStr) || 0;

    return {
      totalIndicadores,
      execPercentStr,
      execPercentNum,
    };
  }, [itemTotals]);

  const pieChartDataIndicadores = useMemo(() => {
    return [
      [titleLabel, "Número de Indicadores"],
      ...itemTotals.map((item) => [item.nombre, item.numIndicadores]),
    ];
  }, [itemTotals, titleLabel]);

  const pieChartDataEjecucion = useMemo(() => {
    return [
      [titleLabel, "Porcentaje de Ejecución"],
      ...itemTotals.map((item) => [
        item.nombre,
        item.execPercentNum === 0 ? 0.0000001 : item.execPercentNum,
      ]),
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
      legend: { position: "right", alignment: "center" },
    };
  }, [itemTotals, titleLabel]);

  const dependencyOptions = useMemo(() => {
    return dependencias
      .filter((item) =>
        viewType === "oficinas"
          ? normalize(item.tipo) === "oficina"
          : viewType === "escuelas"
            ? normalize(item.tipo) !== "oficina"
            : true,
      )
      .filter((item) =>
        selectedTipoDependencia
          ? normalize(item.tipo) === normalize(selectedTipoDependencia)
          : true,
      )
      .filter((item) => canSeeAll || String(item.id) === userDependencyId)
      .sort((a, b) =>
        String(a.nombre || "").localeCompare(String(b.nombre || "")),
      );
  }, [
    dependencias,
    viewType,
    selectedTipoDependencia,
    canSeeAll,
    userDependencyId,
  ]);

  const dependencyAllLabel =
    selectedTipoDependencia === "Escuela"
      ? "Todas las escuelas"
      : selectedTipoDependencia === "Oficina"
        ? "Todas las oficinas"
        : "Todas";
  const dependencyAllValue = selectedTipoDependencia
    ? `__all_${normalize(selectedTipoDependencia)}`
    : "__all";

  useEffect(() => {
    if (
      selectedDependency &&
      !dependencyOptions.some((item) => String(item.id) === selectedDependency)
    ) {
      setSelectedDependency(canSeeAll ? "" : userDependencyId);
    }
  }, [dependencyOptions, selectedDependency, canSeeAll, userDependencyId]);

  const indicatorRows = useMemo(() => {
    const grouped = new Map();
    filteredIndicators.forEach((indicator) => {
      const meta = metaByIndicatorId.get(String(indicator.id));
      const avance = avanceByIndicatorId.get(String(indicator.id));
      const planned = meta ? meta[`meta_${selectedYear}`] : null;
      const executed = avance ? avance[`avance_${selectedYear}`] : null;
      if (!hasYearValue(planned) && !hasYearValue(executed)) return;
      const key = `${indicator.id_desafio}_${normalize(indicator.nombre)}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.metaValue =
          getSafeNumber(existing.metaValue) + getSafeNumber(planned);
        existing.avanceValue =
          getSafeNumber(existing.avanceValue) + getSafeNumber(executed);
        existing.executionPercent = formatExecutionPercent(
          existing.metaValue,
          existing.avanceValue,
        );
        return;
      }
      grouped.set(key, {
        ...indicator,
        desafioNombre: desafioById.get(String(indicator.id_desafio))?.titulo,
        dependenciaNombre: dependenciaById.get(String(indicator.id_dependencia))
          ?.nombre,
        convergenteNombre: convergentes.find(
          (item) =>
            String(item.id) === String(indicator.id_estrategia_convergente),
        )?.titulo,
        metaValue: planned,
        avanceValue: executed,
        executionPercent: formatExecutionPercent(planned, executed),
      });
    });
    return [...grouped.values()];
  }, [
    filteredIndicators,
    metaByIndicatorId,
    avanceByIndicatorId,
    selectedYear,
    desafioById,
    dependenciaById,
    convergentes,
  ]);

  const summaryTotals = useMemo(() => {
    let planned = 0;
    let executed = 0;
    let valid = 0;
    let executedIndicators = 0;
    indicatorRows.forEach((row) => {
      const rowPlanned = parseSheetNumber(row.metaValue);
      const rowExecuted = parseSheetNumber(row.avanceValue);
      if (rowPlanned !== null && rowExecuted !== null && rowPlanned !== 0) {
        planned += rowPlanned;
        executed += rowExecuted;
        valid += 1;
      }
      if (rowExecuted !== null && rowExecuted > 0) {
        executedIndicators += 1;
      }
    });
    const percentage = planned ? Math.min((executed / planned) * 100, 100) : 0;
    const total = indicatorRows.length;
    const missing = total ? ((total - valid) / total) * 100 : 0;
    const validWeight = total ? valid / total : 0;
    return {
      planned,
      executed,
      percentage,
      pending: Math.max(0, 100 - percentage),
      valid,
      executedIndicators,
      chartExecuted: percentage * validWeight,
      chartPending: Math.max(0, 100 - percentage) * validWeight,
      chartMissing: missing,
    };
  }, [indicatorRows]);

  const indicatorColorCounts = useMemo(
    () =>
      indicatorRows.reduce(
        (counts, row) => {
          const value = parseSheetNumber(row.executionPercent);
          if (value === null || row.executionPercent === "Sin registro") {
            counts.sinRegistro += 1;
          } else if (value >= 90) {
            counts.superior += 1;
          } else if (value >= 50) {
            counts.alto += 1;
          } else if (value >= 30) {
            counts.medio += 1;
          } else {
            counts.bajo += 1;
          }
          return counts;
        },
        { superior: 0, alto: 0, medio: 0, bajo: 0, sinRegistro: 0 },
      ),
    [indicatorRows],
  );

  const clearFilters = () => {
    setSelectedDependency(canSeeAll ? "" : userDependencyId);
    setSelectedTipoDependencia("");
    setSelectedDesafio("");
    setSelectedRespondeA("");
    setSelectedConvergente("");
    setSelectedFacultad("");
    setSelectedPrograma("");
    setSelectedResultado("");
  };

  const exportToPdf = () => {
    const doc = new jsPDF("l", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    const addTitle = (title) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(0, 0, 0);
      doc.text(title, margin, 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      doc.text(
        `Año: ${selectedYear} | Generado: ${new Date().toLocaleString("es-CO")}`,
        margin,
        20,
      );
    };

    const addTable = (head, body, options = {}) => {
      autoTable(doc, {
        startY: options.startY || 26,
        margin: { left: margin, right: margin },
        head: [head],
        body,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
        headStyles: {
          fillColor: [52, 73, 94],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        ...options,
      });
    };

    const addCanvasImage = (canvas, x, y, width, height) => {
      doc.addImage(canvas.toDataURL("image/png"), "PNG", x, y, width, height);
    };

    const drawPieChart = (
      values,
      labels,
      colors,
      formatValue = (value) => `${value.toFixed(1)}%`,
    ) => {
      const canvas = document.createElement("canvas");
      canvas.width = 520;
      canvas.height = 320;
      const context = canvas.getContext("2d");
      const total = values.reduce((sum, value) => sum + value, 0);
      const centerX = 150;
      const centerY = 155;
      const radius = 115;
      let angle = -Math.PI / 2;

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      values.forEach((value, index) => {
        if (value <= 0 || total <= 0) return;
        const nextAngle = angle + (value / total) * Math.PI * 2;
        context.beginPath();
        context.moveTo(centerX, centerY);
        context.arc(centerX, centerY, radius, angle, nextAngle);
        context.closePath();
        context.fillStyle = colors[index];
        context.fill();
        context.strokeStyle = "#ffffff";
        context.lineWidth = 3;
        context.stroke();
        angle = nextAngle;
      });

      context.font = "bold 16px sans-serif";
      labels.forEach((label, index) => {
        const y = 55 + index * 42;
        context.fillStyle = colors[index];
        context.fillRect(315, y - 15, 20, 20);
        context.fillStyle = "#000000";
        context.fillText(
          `${label} (${formatValue(values[index])})`,
          345,
          y + 2,
        );
      });
      return canvas;
    };

    const drawBarChart = (rows, items = []) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1100;
      canvas.height = 360;
      const context = canvas.getContext("2d");
      const chartLeft = 70;
      const chartTop = 25;
      const chartWidth = 780;
      const chartHeight = 260;
      const series = items.length
        ? items
        : [{ id: "desafio", nombre: "Porcentaje ejecutado" }];
      const groupWidth = chartWidth / Math.max(rows.length, 1);
      const barWidth = Math.min(38, (groupWidth * 0.72) / series.length);
      const colors = ["#3498db", "#4CAF50", "#F39C12", "#8E44AD", "#16A085"];

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#555555";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(chartLeft, chartTop);
      context.lineTo(chartLeft, chartTop + chartHeight);
      context.lineTo(chartLeft + chartWidth, chartTop + chartHeight);
      context.stroke();

      context.font = "14px sans-serif";
      context.fillStyle = "#555555";
      [0, 25, 50, 75, 100].forEach((tick) => {
        const y = chartTop + chartHeight - (tick / 100) * chartHeight;
        context.strokeStyle = "#e0e0e0";
        context.beginPath();
        context.moveTo(chartLeft, y);
        context.lineTo(chartLeft + chartWidth, y);
        context.stroke();
        context.fillText(`${tick}%`, 18, y + 5);
      });

      rows.forEach((row, rowIndex) => {
        series.forEach((item, seriesIndex) => {
          const value = items.length
            ? row.schools?.[String(item.id)]?.metaEjecutadaNum || 0
            : row.metaEjecutadaNum;
          const safeValue = Math.max(0, Math.min(100, value));
          const x =
            chartLeft +
            rowIndex * groupWidth +
            groupWidth / 2 +
            (seriesIndex - (series.length - 1) / 2) * barWidth -
            barWidth / 2;
          const height = (safeValue / 100) * chartHeight;
          const y = chartTop + chartHeight - height;
          context.fillStyle = colors[seriesIndex % colors.length];
          context.fillRect(x, y, barWidth - 2, height);
          context.fillStyle = "#000000";
          context.font = "bold 11px sans-serif";
          context.fillText(`${safeValue.toFixed(1)}%`, x, y - 4);
        });
        context.save();
        context.translate(
          chartLeft + rowIndex * groupWidth + groupWidth / 2,
          chartTop + chartHeight + 22,
        );
        context.rotate(-Math.PI / 6);
        context.textAlign = "right";
        context.fillStyle = "#000000";
        context.font = "13px sans-serif";
        context.fillText(String(row.desafioNombre).slice(0, 24), 0, 0);
        context.restore();
      });
      if (items.length) {
        items.forEach((item, index) => {
          context.fillStyle = colors[index % colors.length];
          context.fillRect(875, 45 + index * 28, 16, 16);
          context.fillStyle = "#000000";
          context.font = "13px sans-serif";
          context.fillText(
            String(item.nombre).slice(0, 25),
            900,
            58 + index * 28,
          );
        });
      }
      return canvas;
    };

    const addWideView = (title, items) => {
      doc.addPage("l");
      addTitle(title);
      const columns = items.map(
        (item) => item.nombre || `Dependencia ${item.id}`,
      );
      const body = statsByEscuela.map((row) => [
        row.desafioNombre,
        ...items.map((item) => {
          const itemData = row.schools[String(item.id)];
          return itemData
            ? `${itemData.numIndicadores} indicadores\n${itemData.metaEjecutadaStr} ejecutado\n${itemData.pendienteStr} pendiente`
            : "-";
        }),
      ]);
      addTable(["Desafío", ...columns], body, {
        columnStyles: { 0: { cellWidth: 48 } },
        styles: { fontSize: 6, cellPadding: 2, overflow: "linebreak" },
      });

      const totals = items.map((item) => {
        let planned = 0;
        let executed = 0;
        let count = 0;
        statsByEscuela.forEach((row) => {
          const itemData = row.schools[String(item.id)];
          if (!itemData) return;
          count += itemData.numIndicadores;
          planned += itemData.metaPlaneada;
          executed += itemData.metaEjecutada;
        });
        return {
          ...item,
          count,
          percentage:
            parseSheetNumber(formatExecutionPercent(planned, executed)) || 0,
        };
      });

      doc.addPage("l");
      addTitle(`${title} - Gráficas`);
      const barCanvas = drawBarChart(statsByEscuela, items);
      const indicatorPie = drawPieChart(
        totals.map((item) => item.count),
        totals.map((item) => String(item.nombre).slice(0, 22)),
        totals.map(
          (_, index) =>
            ["#3498db", "#4CAF50", "#F39C12", "#8E44AD", "#16A085"][index % 5],
        ),
        (value) => String(value),
      );
      const executionPie = drawPieChart(
        totals.map((item) => item.percentage),
        totals.map((item) => String(item.nombre).slice(0, 22)),
        totals.map(
          (_, index) =>
            ["#3498db", "#4CAF50", "#F39C12", "#8E44AD", "#16A085"][index % 5],
        ),
      );
      addCanvasImage(barCanvas, margin, 28, 175, 57);
      addCanvasImage(indicatorPie, margin, 92, 125, 77);
      addCanvasImage(executionPie, 145, 92, 125, 77);
    };

    addTitle("Consolidados - Resumen");
    addTable(
      ["Concepto", "Cantidad"],
      [
        ["Total indicadores", String(totalSummaryIndicators)],
        ...statsByDesafio.map((row) => [
          row.desafioNombre,
          String(row.numIndicadores),
        ]),
        ["Indicadores ejecutados", String(summaryTotals.executedIndicators)],
        [
          "Porcentaje de cumplimiento",
          `${summaryTotals.percentage.toFixed(1)}%`,
        ],
      ],
    );

    doc.addPage("l");
    addTitle("Consolidados - Gráficas y colores");
    const pieCanvas = drawPieChart(
      [
        summaryTotals.chartExecuted,
        summaryTotals.chartPending,
        summaryTotals.chartMissing,
      ],
      ["Ejecutado", "Pendiente", "Sin registro"],
      ["#4CAF50", "#F44336", "#9E9E9E"],
    );
    addCanvasImage(pieCanvas, margin, 28, 125, 77);
    addTable(
      ["Rango", "Cantidad"],
      [
        ["Mayores de 90%", indicatorColorCounts.superior],
        ["Entre 50% y 89%", indicatorColorCounts.alto],
        ["Entre 30% y 49%", indicatorColorCounts.medio],
        ["Entre 0% y 29%", indicatorColorCounts.bajo],
        ["Sin registro", indicatorColorCounts.sinRegistro],
      ],
      {
        startY: 112,
        tableWidth: 120,
        didDrawCell: (data) => {
          if (data.section !== "body" || data.column.index !== 0) return;
          const colors = [
            [144, 238, 144],
            [173, 216, 230],
            [255, 255, 0],
            [250, 128, 114],
            [158, 158, 158],
          ];
          const color = colors[data.row.index];
          if (!color) return;
          doc.setFillColor(...color);
          doc.rect(
            data.cell.x,
            data.cell.y,
            data.cell.width,
            data.cell.height,
            "F",
          );
          doc.setTextColor(0, 0, 0);
          doc.text(
            String(data.cell.raw),
            data.cell.x + 2,
            data.cell.y + data.cell.height / 2 + 2,
          );
        },
      },
    );

    doc.addPage("l");
    addTitle("Consolidados - Detallado");
    addTable(
      [
        "Desafío",
        "Estrategia convergente",
        "Indicador",
        "Dependencia",
        "Meta planeada",
        "Meta ejecutada",
        "% ejecutado",
      ],
      indicatorRows.map((row) => [
        toText(row.desafioNombre),
        toText(row.convergenteNombre),
        toText(row.nombre),
        toText(row.dependenciaNombre),
        row.metaValue ?? "Sin registro",
        row.avanceValue ?? "Sin registro",
        row.executionPercent,
      ]),
    );

    doc.addPage("l");
    addTitle("Consolidados - Por Desafíos");
    addTable(
      [
        "Desafío",
        "N.º indicadores",
        "Meta planeada",
        "Meta ejecutada",
        "% ejecutado",
        "Pendiente",
      ],
      statsByDesafio.map((row) => [
        row.desafioNombre,
        row.numIndicadores,
        row.metaPlaneada,
        row.metaEjecutada,
        row.metaEjecutadaStr,
        row.pendienteStr,
      ]),
    );

    doc.addPage("l");
    addTitle("Consolidados - Por Desafíos - Gráfica");
    addCanvasImage(drawBarChart(statsByDesafio), margin, 28, 260, 104);

    addWideView("Consolidados - Por Escuela", activeSchools);
    addWideView("Consolidados - Por Oficina", activeOficinas);
    doc.save(`consolidados_${selectedYear}.pdf`);
  };

  return (
    <Box className="seguimientos-page">
      <Paper className="seguimientos-panel" elevation={1}>
        <Box className="seguimientos-header">
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Consolidados
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {summaryTotals.valid} indicadores con seguimiento
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Año</InputLabel>
            <Select
              value={selectedYear}
              label="Año"
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {(availableYears.length
                ? availableYears
                : [String(new Date().getFullYear())]
              ).map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Dependencia</InputLabel>
            <Select
              value={selectedDependency || dependencyAllValue}
              label="Dependencia"
              onChange={(e) =>
                setSelectedDependency(
                  String(e.target.value).startsWith("__all")
                    ? ""
                    : e.target.value,
                )
              }
              disabled={!canSeeAll}
            >
              <MenuItem value={dependencyAllValue}>
                {dependencyAllLabel}
              </MenuItem>
              {dependencyOptions.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.nombre)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={clearFilters}>
            Limpiar filtros
          </Button>
          <Button
            variant={advancedFiltersOpen ? "contained" : "outlined"}
            onClick={() => setAdvancedFiltersOpen((previous) => !previous)}
          >
            {advancedFiltersOpen ? "Ocultar filtros" : "Ver más filtros"}
          </Button>
          <Button variant="contained" onClick={exportToPdf}>
            Exportar a PDF
          </Button>
        </Box>
        <Box
          className="seguimientos-advanced-filters"
          sx={{
            display: advancedFiltersOpen ? "grid" : "none",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(3, minmax(0, 1fr))",
            },
          }}
        >
          <FormControl size="small" fullWidth>
            <InputLabel>Desafío</InputLabel>
            <Select
              value={selectedDesafio}
              label="Desafío"
              onChange={(e) => setSelectedDesafio(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {desafios.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.titulo)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Estrategia convergente</InputLabel>
            <Select
              value={selectedConvergente}
              label="Estrategia convergente"
              onChange={(e) => setSelectedConvergente(e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              {convergentes.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.titulo)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Estrategia facultad</InputLabel>
            <Select
              value={selectedFacultad}
              label="Estrategia facultad"
              onChange={(e) => setSelectedFacultad(e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              {facultades.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.titulo)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Programa institucional</InputLabel>
            <Select
              value={selectedPrograma}
              label="Programa institucional"
              onChange={(e) => setSelectedPrograma(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {programas.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.titulo)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Indicador resultado</InputLabel>
            <Select
              value={selectedResultado}
              label="Indicador resultado"
              onChange={(e) => setSelectedResultado(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {resultados.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.nombre)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <Typography className="radio-group-title">
              Tipo de dependencia
            </Typography>
            <RadioGroup
              row
              value={selectedTipoDependencia}
              onChange={(e) => {
                setSelectedTipoDependencia(e.target.value);
                setSelectedDependency("");
              }}
            >
              <FormControlLabel
                value=""
                control={<Radio size="small" />}
                label="Todas"
              />
              <FormControlLabel
                value="Oficina"
                control={<Radio size="small" />}
                label="Oficina"
              />
              <FormControlLabel
                value="Escuela"
                control={<Radio size="small" />}
                label="Escuela"
              />
            </RadioGroup>
          </FormControl>
          <FormControl size="small">
            <Typography className="radio-group-title">Responde a</Typography>
            <RadioGroup
              row
              value={selectedRespondeA}
              onChange={(e) => setSelectedRespondeA(e.target.value)}
            >
              <FormControlLabel
                value=""
                control={<Radio size="small" />}
                label="Todas"
              />
              {respondeAs.map((item) => (
                <FormControlLabel
                  key={item.id}
                  value={item.nombre}
                  control={<Radio size="small" />}
                  label={item.nombre}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </Box>
      </Paper>
      <ToggleButtonGroup
        className="seguimientos-view-tabs"
        value={viewType}
        exclusive
        onChange={(_, value) => {
          if (value !== null) setViewType(value);
        }}
        size="small"
        color="primary"
        sx={{ mb: 2 }}
      >
        <ToggleButton value="resumen">Resumen</ToggleButton>
        <ToggleButton value="indicadores">Detallado</ToggleButton>
        <ToggleButton value="desafios">Por Desafíos</ToggleButton>
        {canSeeAllConsolidatedViews && (
          <>
            <ToggleButton value="escuelas">Por Escuela</ToggleButton>
            <ToggleButton value="oficinas">Por Oficina</ToggleButton>
          </>
        )}
      </ToggleButtonGroup>

      {viewType === "resumen" && (
        <Paper className="seguimientos-summary-horizontal" elevation={1}>
          <Box className="seguimientos-summary-inner">
            <Box className="seguimientos-summary-section seguimientos-summary-resumen">
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                Resumen
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Concepto</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Cantidad</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>
                        Total indicadores
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        {totalSummaryIndicators}
                      </TableCell>
                    </TableRow>
                    {statsByDesafio.map((row) => (
                      <TableRow key={row.id_desafio}>
                        <TableCell>{toText(row.desafioNombre)}</TableCell>
                        <TableCell>{row.numIndicadores}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
            <Box className="seguimientos-summary-right">
              <Box className="seguimientos-summary-charts-row">
                <Box className="seguimientos-summary-section seguimientos-summary-chart">
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                    Cumplimiento General
                  </Typography>
                  <PieChart
                    series={[
                      {
                        data: [
                          {
                            id: 0,
                            value: summaryTotals.chartExecuted,
                            label: "Ejecutado",
                            color: "green",
                          },
                          {
                            id: 1,
                            value: summaryTotals.chartPending,
                            label: "Pendiente",
                            color: "red",
                          },
                          {
                            id: 2,
                            value: summaryTotals.chartMissing,
                            label: "Sin registro",
                            color: "grey",
                          },
                        ],
                      },
                    ]}
                    width={290}
                    height={220}
                    margin={{ bottom: 60 }}
                    slotProps={{
                      legend: {
                        direction: "row",
                        position: { vertical: "bottom", horizontal: "middle" },
                        padding: 0,
                        labelStyle: { fontSize: 11 },
                      },
                    }}
                  />
                </Box>
                <Box className="seguimientos-summary-section">
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                    Indicadores por color
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        {[
                          [
                            "Mayores de 90%",
                            indicatorColorCounts.superior,
                            "lightgreen",
                          ],
                          [
                            "Entre 50% y 89%",
                            indicatorColorCounts.alto,
                            "lightblue",
                          ],
                          [
                            "Entre 30% y 49%",
                            indicatorColorCounts.medio,
                            "yellow",
                          ],
                          [
                            "Entre 0% y 29%",
                            indicatorColorCounts.bajo,
                            "salmon",
                          ],
                          [
                            "Sin registro",
                            indicatorColorCounts.sinRegistro,
                            "grey",
                          ],
                        ].map(([label, count, color]) => (
                          <TableRow key={label}>
                            <TableCell
                              sx={{
                                fontWeight: 800,
                                backgroundColor: "#f5f5f5",
                              }}
                            >
                              {label}
                            </TableCell>
                            <TableCell sx={{ backgroundColor: color }}>
                              {count}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Box>
              <Box className="seguimientos-stats-cards">
                <Paper
                  className="seguimientos-stat-card"
                  elevation={0}
                  sx={{ backgroundColor: "#b4b4b4ff" }}
                >
                  <Typography
                    className="seguimientos-stat-label"
                    sx={{ color: "#000000ff", fontWeight: 500 }}
                  >
                    Indicadores ejecutados
                  </Typography>
                  <Typography
                    className="seguimientos-stat-value"
                    sx={{ size: "2.5rem", fontWeight: 800 }}
                  >
                    {summaryTotals.executedIndicators}
                  </Typography>
                </Paper>
                <Paper
                  className="seguimientos-stat-card"
                  elevation={0}
                  sx={{ backgroundColor: "#b4b4b4ff" }}
                >
                  <Typography
                    className="seguimientos-stat-label"
                    sx={{ color: "#000000ff", fontWeight: 500 }}
                  >
                    Porcentaje de cumplimiento
                  </Typography>
                  <Typography
                    className="seguimientos-stat-value"
                    sx={{ size: "2.5rem", fontWeight: 800 }}
                  >
                    {summaryTotals.percentage.toFixed(1).replace(".", ",")}%
                  </Typography>
                </Paper>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {viewType === "indicadores" && (
        <TableContainer component={Paper} className="seguimientos-table-card">
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Desafío</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  Estrategia Convergente
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Nombre Indicador</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Dependencia</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Meta planeada</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Meta ejecutada</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  Porcentaje ejecutado
                </TableCell>
              </TableRow>
              {indicatorRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{toText(row.desafioNombre)}</TableCell>
                  <TableCell>{toText(row.convergenteNombre)}</TableCell>
                  <TableCell>{toText(row.nombre)}</TableCell>
                  <TableCell>{toText(row.dependenciaNombre)}</TableCell>
                  <TableCell>{row.metaValue ?? "Sin registro"}</TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: percentageClass(row.executionPercent),
                    }}
                  >
                    {row.avanceValue ?? "Sin registro"}
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: percentageClass(row.executionPercent),
                    }}
                  >
                    {row.executionPercent}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={5} sx={{ fontWeight: 800 }}>
                  Total porcentaje ejecutado
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {summaryTotals.percentage.toFixed(1).replace(".", ",")}%
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={5} sx={{ fontWeight: 800 }}>
                  Pendiente por ejecutar
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {summaryTotals.pending.toFixed(1).replace(".", ",")}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {viewType === "desafios" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Typography variant="h6" sx={{ color: "#34495e" }}>
            Vista por Desafíos
          </Typography>

          <TableContainer
            component={Paper}
            sx={{ boxShadow: 3, borderRadius: 2 }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#34495e" }}>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    Desafíos
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "white",
                      fontWeight: "bold",
                      textAlign: "right",
                    }}
                  >
                    N.º indicadores
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "white",
                      fontWeight: "bold",
                      textAlign: "right",
                    }}
                  >
                    Meta Planeada
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "white",
                      fontWeight: "bold",
                      textAlign: "right",
                    }}
                  >
                    Meta Ejecutada
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "white",
                      fontWeight: "bold",
                      textAlign: "right",
                    }}
                  >
                    Porcentaje ejecutado
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "white",
                      fontWeight: "bold",
                      textAlign: "right",
                    }}
                  >
                    Pendiente por ejecutar
                  </TableCell>
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
                      <TableCell sx={{ fontWeight: "medium" }}>
                        {toText(row.desafioNombre)}
                      </TableCell>
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
                            backgroundColor:
                              row.metaEjecutadaNum >= 90
                                ? "#d4edda"
                                : row.metaEjecutadaNum >= 50
                                  ? "#cce5ff"
                                  : row.metaEjecutadaNum >= 30
                                    ? "#fff3cd"
                                    : "#f8d7da",
                            color:
                              row.metaEjecutadaNum >= 90
                                ? "#155724"
                                : row.metaEjecutadaNum >= 50
                                  ? "#004085"
                                  : row.metaEjecutadaNum >= 30
                                    ? "#856404"
                                    : "#721c24",
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
              <Typography
                variant="subtitle1"
                sx={{ mb: 2, fontWeight: "bold", textAlign: "center" }}
              >
                Porcentaje de Ejecución por Desafío
              </Typography>
              <Box sx={{ width: "100%", height: 400 }}>
                <BarChart
                  dataset={chartDataDesafios}
                  xAxis={[{ scaleType: "band", dataKey: "desafio" }]}
                  yAxis={[{ min: 0, max: 100 }]}
                  series={[
                    {
                      dataKey: "ejecutado",
                      label: "Porcentaje ejecutado",
                      color: "#3498db",
                      valueFormatter: (v) => (v != null ? `${v}%` : ""),
                    },
                  ]}
                  margin={{ top: 20, bottom: 80, left: 50, right: 20 }}
                  barLabel="value"
                  slotProps={{
                    legend: {
                      position: { vertical: "top", horizontal: "middle" },
                    },
                  }}
                />
              </Box>
            </Paper>
          )}
        </Box>
      )}

      {(viewType === "escuelas" || viewType === "oficinas") && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" sx={{ color: "#34495e" }}>
              Vista por {titleLabel}
            </Typography>
            {/** 
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
*/}
          </Box>

          <TableContainer
            component={Paper}
            sx={{ boxShadow: 3, borderRadius: 2, overflowX: "auto" }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#34495e" }}>
                  <TableCell
                    rowSpan={2}
                    sx={{
                      color: "white",
                      fontWeight: "bold",
                      borderRight: "1px solid rgba(224, 224, 224, 0.3)",
                    }}
                  >
                    Desafíos
                  </TableCell>
                  {displayedItems.length > 0 ? (
                    displayedItems.map((item) => (
                      <TableCell
                        key={item.id}
                        colSpan={3}
                        align="center"
                        sx={{
                          color: "white",
                          fontWeight: "bold",
                          borderRight: "1px solid rgba(224, 224, 224, 0.3)",
                        }}
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
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: "bold",
                          borderLeft: "1px solid rgba(224, 224, 224, 0.3)",
                        }}
                      >
                        N.º indicadores
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>
                        Porcentaje ejecutado
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: "bold",
                          borderRight: "1px solid rgba(224, 224, 224, 0.3)",
                        }}
                      >
                        Pendiente
                      </TableCell>
                    </React.Fragment>
                  ))}
                  {displayedItems.length === 0 && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {statsByEscuela.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={1 + displayedItems.length * 3}
                      align="center"
                      sx={{ py: 3 }}
                    >
                      No hay datos para mostrar en este año y filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  statsByEscuela.map((row) => (
                    <TableRow key={row.id_desafio} hover>
                      <TableCell
                        align="left"
                        sx={{ fontWeight: "medium", whiteSpace: "nowrap" }}
                      >
                        {row.desafioNombre}
                      </TableCell>
                      {displayedItems.map((item) => {
                        const itemData = row.schools[String(item.id)];
                        if (!itemData) {
                          return (
                            <React.Fragment key={item.id}>
                              <TableCell
                                align="right"
                                sx={{
                                  borderLeft:
                                    "1px solid rgba(224, 224, 224, 1)",
                                }}
                              >
                                -
                              </TableCell>
                              <TableCell align="right">-</TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  borderRight:
                                    "1px solid rgba(224, 224, 224, 1)",
                                }}
                              >
                                -
                              </TableCell>
                            </React.Fragment>
                          );
                        }
                        return (
                          <React.Fragment key={item.id}>
                            <TableCell
                              align="right"
                              sx={{
                                borderLeft: "1px solid rgba(224, 224, 224, 1)",
                              }}
                            >
                              {itemData.numIndicadores}
                            </TableCell>
                            <TableCell align="right">
                              <Box
                                sx={{
                                  display: "inline-block",
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  backgroundColor:
                                    itemData.metaEjecutadaNum >= 90
                                      ? "#d4edda"
                                      : itemData.metaEjecutadaNum >= 50
                                        ? "#cce5ff"
                                        : itemData.metaEjecutadaNum >= 30
                                          ? "#fff3cd"
                                          : "#f8d7da",
                                  color:
                                    itemData.metaEjecutadaNum >= 90
                                      ? "#155724"
                                      : itemData.metaEjecutadaNum >= 50
                                        ? "#004085"
                                        : itemData.metaEjecutadaNum >= 30
                                          ? "#856404"
                                          : "#721c24",
                                }}
                              >
                                {itemData.metaEjecutadaStr}
                              </Box>
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                borderRight: "1px solid rgba(224, 224, 224, 1)",
                              }}
                            >
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
              <Typography
                variant="subtitle1"
                sx={{ mb: 2, fontWeight: "bold", textAlign: "center" }}
              >
                Porcentaje de Ejecución por Desafío y {titleLabel}
              </Typography>
              <Box sx={{ width: "100%", height: 500 }}>
                <BarChart
                  dataset={chartDataItems}
                  xAxis={[{ scaleType: "band", dataKey: "desafio" }]}
                  yAxis={[{ min: 0, max: 100 }]}
                  series={seriesItems}
                  margin={{ top: 80, bottom: 80, left: 50, right: 20 }}
                  barLabel="value"
                  slotProps={{
                    legend: {
                      position: { vertical: "top", horizontal: "middle" },
                      itemMarkWidth: 10,
                      itemMarkHeight: 10,
                      labelStyle: { fontSize: 12 },
                      padding: 10,
                    },
                  }}
                />
              </Box>
            </Paper>
          )}

          {itemTotals.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Typography variant="h6" sx={{ color: "#34495e" }}>
                Resumen Total por {titleLabel}
              </Typography>
              <TableContainer
                component={Paper}
                sx={{ boxShadow: 3, borderRadius: 2 }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#34495e" }}>
                      <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                        {titleLabel}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "white",
                          fontWeight: "bold",
                          textAlign: "right",
                        }}
                      >
                        N.º indicadores
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "white",
                          fontWeight: "bold",
                          textAlign: "right",
                        }}
                      >
                        Porcentaje de ejecución
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {itemTotals.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ fontWeight: "medium" }}>
                          {row.nombre}
                        </TableCell>
                        <TableCell align="right">
                          {row.numIndicadores}
                        </TableCell>
                        <TableCell align="right">
                          <Box
                            sx={{
                              display: "inline-block",
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              backgroundColor:
                                row.execPercentNum >= 90
                                  ? "#d4edda"
                                  : row.execPercentNum >= 50
                                    ? "#cce5ff"
                                    : row.execPercentNum >= 30
                                      ? "#fff3cd"
                                      : "#f8d7da",
                              color:
                                row.execPercentNum >= 90
                                  ? "#155724"
                                  : row.execPercentNum >= 50
                                    ? "#004085"
                                    : row.execPercentNum >= 30
                                      ? "#856404"
                                      : "#721c24",
                            }}
                          >
                            {row.execPercentStr}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ backgroundColor: "#f8f9fa" }}>
                      <TableCell sx={{ fontWeight: "bold" }}>TOTAL</TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>
                        {globalTotals.totalIndicadores}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>
                        <Box
                          sx={{
                            display: "inline-block",
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            backgroundColor:
                              globalTotals.execPercentNum >= 90
                                ? "#d4edda"
                                : globalTotals.execPercentNum >= 50
                                  ? "#cce5ff"
                                  : globalTotals.execPercentNum >= 30
                                    ? "#fff3cd"
                                    : "#f8d7da",
                            color:
                              globalTotals.execPercentNum >= 90
                                ? "#155724"
                                : globalTotals.execPercentNum >= 50
                                  ? "#004085"
                                  : globalTotals.execPercentNum >= 30
                                    ? "#856404"
                                    : "#721c24",
                          }}
                        >
                          {globalTotals.execPercentStr}
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <Paper
                  sx={{
                    p: 2,
                    boxShadow: 3,
                    borderRadius: 2,
                    flex: "1 1 45%",
                    minWidth: "300px",
                  }}
                >
                  <Chart
                    chartType="PieChart"
                    data={pieChartDataIndicadores}
                    options={{
                      title: `Número de Indicadores por ${titleLabel}`,
                      is3D: false,
                      legend: { position: "right", alignment: "center" },
                    }}
                    width={"100%"}
                    height={"400px"}
                  />
                </Paper>
                <Paper
                  sx={{
                    p: 2,
                    boxShadow: 3,
                    borderRadius: 2,
                    flex: "1 1 45%",
                    minWidth: "300px",
                  }}
                >
                  <Chart
                    chartType="PieChart"
                    data={pieChartDataEjecucion}
                    options={{
                      title: `Porcentaje de Ejecución por ${titleLabel}`,
                      is3D: false,
                      sliceVisibilityThreshold: 0,
                      legend: { position: "right", alignment: "center" },
                    }}
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
