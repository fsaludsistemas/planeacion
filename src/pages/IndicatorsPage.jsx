import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  Input,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import CreateIndicator from "../components/CreateIndicator";
import EditModal from "../components/EditModal";
import ModalDetails from "../components/ModalDetails";
import {
  createSheetRow,
  deleteSheetRow,
  saveEvidenceRow,
  updateSheetRow,
} from "../api/api";
import "../styles/indicators.css";

const SHEET_NAME = "INDICADORES_PRODUCTO";
const META_SHEET_NAME = "METAS";
const EVIDENCES_SHEET_NAME = "EVIDENCIAS";
const EVIDENCE_URL_FIELD = "url_documento_evidencia";
const EVIDENCE_YEAR = 2026;
const USERS_SHEET_NAME = "USUARIOS";
const toText = (value) => String(value ?? "").trim() || "-";
const normalizeRole = (value) => normalize(value);
const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const getSheet = (data, ...keys) => {
  for (const key of keys) {
    const value = data?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const sortById = (items) =>
  [...items].sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));

const sortIndicatorsByDependency = (items) =>
  [...items].sort((a, b) => {
    const depA = normalize(a?.dependencia?.nombre);
    const depB = normalize(b?.dependencia?.nombre);

    if (depA !== depB) {
      return depA.localeCompare(depB, "es", { sensitivity: "base" });
    }

    const idA = Number(a?.id ?? 0);
    const idB = Number(b?.id ?? 0);
    return idA - idB;
  });

const getTipoDependencia = (dependencia) => {
  const value = normalize(dependencia?.tipo);
  if (value === "escuela") return "Escuela";
  if (value === "oficina") return "Oficina";
  return "No definido";
};

const matchesRespondeAFilter = (idRespondeA, filterValue, respondeAById) => {
  if (!filterValue) return true;
  const item = respondeAById.get(String(idRespondeA));
  return normalize(item?.nombre) === normalize(filterValue);
};

const isGoogleSheetsUrl = (value) => {
  const url = String(value ?? "").trim();
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "docs.google.com" &&
      parsed.pathname.includes("/spreadsheets/d/")
    );
  } catch {
    return false;
  }
};

const getSheetEmbedUrl = (value) => {
  const url = String(value ?? "").trim();
  if (!url) return "";

  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "docs.google.com" &&
      parsed.pathname.includes("/spreadsheets/d/")
    ) {
      parsed.searchParams.set("rm", "minimal");
      return parsed.toString();
    }
  } catch {
    return url;
  }

  return url;
};

const parseNumericValue = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace("%", "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatPercentage = (value) => {
  if (!Number.isFinite(value)) return "-";
  const rounded = Math.round(value * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}%`;
};

const getAvanceDisplay = (avanceValue, metaValue) => {
  const avanceText = String(avanceValue ?? "").trim();
  if (!avanceText) return "-";
  if (avanceText.includes("%")) return avanceText;

  const avanceNumber = parseNumericValue(avanceText);
  const metaNumber = parseNumericValue(metaValue);

  if (avanceNumber === null || metaNumber === null || metaNumber === 0) {
    return avanceText;
  }

  return formatPercentage((avanceNumber / metaNumber) * 100);
};

const LAST_EXPANDED_INDICATOR_KEY = "indicators.lastExpandedId";

const IndicatorsPage = ({ data, userInfo, onRefreshData }) => {
  const [filters, setFilters] = useState({
    dependencia: "",
    tipoDependencia: "TODAS",
    respondeA: "",
    desafio: "",
    estrategiaConvergente: "",
    estrategiaFacultad: "",
    programaInstitucional: "",
    indicadorResultado: "",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editState, setEditState] = useState({ open: false, indicator: null });
  const [detailsState, setDetailsState] = useState({
    open: false,
    indicator: null,
  });
  const [expandedId, setExpandedId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState({});
  const [logroValues, setLogroValues] = useState({});
  const [sheetModalState, setSheetModalState] = useState({
    open: false,
    url: "",
    indicatorName: "",
  });
  const hasHydratedExpandedIdRef = useRef(false);
  const scrollTimerRef = useRef(null);
  const logroSaveTimersRef = useRef({});

  useEffect(() => {
    return () => {
      Object.values(logroSaveTimersRef.current).forEach((timerId) => {
        if (timerId) clearTimeout(timerId);
      });
    };
  }, []);

  useEffect(() => {
    if (expandedId) {
      sessionStorage.setItem(LAST_EXPANDED_INDICATOR_KEY, String(expandedId));
      hasHydratedExpandedIdRef.current = true;
    } else if (hasHydratedExpandedIdRef.current) {
      sessionStorage.removeItem(LAST_EXPANDED_INDICATOR_KEY);
    }
  }, [expandedId]);

  useEffect(() => {
    if (!data || expandedId) return;
    const storedExpandedId = sessionStorage.getItem(
      LAST_EXPANDED_INDICATOR_KEY,
    );
    if (!storedExpandedId) return;

    const exists = getSheet(data, "INDICADORES_PRODUCTO").some(
      (indicator) => String(indicator?.id) === String(storedExpandedId),
    );
    if (exists) {
      setExpandedId(String(storedExpandedId));
      hasHydratedExpandedIdRef.current = true;
    }
  }, [data, expandedId]);

  const sessionUser = useMemo(() => {
    if (userInfo) return userInfo;
    try {
      const stored = sessionStorage.getItem("loggedUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [userInfo]);

  const indicators = useMemo(
    () => sortById(getSheet(data, "INDICADORES_PRODUCTO")),
    [data],
  );
  const usuarios = useMemo(
    () => sortById(getSheet(data, USERS_SHEET_NAME)),
    [data],
  );
  const dependencias = useMemo(
    () => sortById(getSheet(data, "DEPENDENCIA", "DEPENDENCIAS")),
    [data],
  );
  const respondeAs = useMemo(
    () => sortById(getSheet(data, "RESPONDE_A")),
    [data],
  );
  const desafios = useMemo(() => sortById(getSheet(data, "DESAFIOS")), [data]);
  const estrategiasConvergentes = useMemo(
    () =>
      sortById(
        getSheet(data, "ESTRATEGIA_CONVERGENTE", "ESTRATEGIA_CONVERGENTE"),
      ),
    [data],
  );

  const periodos = useMemo(() => sortById(getSheet(data, "PERIODO")), [data]);
  const estrategiasFacultad = useMemo(
    () => sortById(getSheet(data, "ESTRATEGIA_FACULTAD")),
    [data],
  );
  const programasInstitucionales = useMemo(
    () => sortById(getSheet(data, "PROGRAMAS_INST")),
    [data],
  );
  const indicadoresResultado = useMemo(
    () => sortById(getSheet(data, "INDICADORES_RESULTADO")),
    [data],
  );
  const metas = useMemo(() => sortById(getSheet(data, "METAS")), [data]);
  const avances = useMemo(() => sortById(getSheet(data, "AVANCES")), [data]);
  const evidencias = useMemo(
    () => sortById(getSheet(data, EVIDENCES_SHEET_NAME)),
    [data],
  );

  useEffect(() => {
    if (!expandedId) return;
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = setTimeout(() => {
      const element = document.querySelector(
        `[data-indicator-id="${expandedId}"]`,
      );
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, [expandedId, indicators.length]);

  const byId = (items) => new Map(items.map((item) => [String(item.id), item]));
  const dependenciaById = useMemo(() => byId(dependencias), [dependencias]);
  const respondeAById = useMemo(() => byId(respondeAs), [respondeAs]);
  const desafioById = useMemo(() => byId(desafios), [desafios]);
  const convergenteById = useMemo(
    () => byId(estrategiasConvergentes),
    [estrategiasConvergentes],
  );
  const facultadById = useMemo(
    () => byId(estrategiasFacultad),
    [estrategiasFacultad],
  );
  const programaById = useMemo(
    () => byId(programasInstitucionales),
    [programasInstitucionales],
  );
  const resultadoById = useMemo(
    () => byId(indicadoresResultado),
    [indicadoresResultado],
  );
  const periodoById = useMemo(() => byId(periodos), [periodos]);
  const metaByIndicatorId = useMemo(
    () =>
      new Map(metas.map((item) => [String(item.id_indicador_producto), item])),
    [metas],
  );
  const avanceByIndicatorId = useMemo(
    () => new Map(avances.map((item) => [String(item.id_indicador), item])),
    [avances],
  );
  const evidenciaByIndicatorId = useMemo(
    () =>
      new Map(
        evidencias.map((item) => [String(item.id_indicador_producto), item]),
      ),
    [evidencias],
  );
  const userById = useMemo(
    () => new Map(usuarios.map((item) => [String(item.id), item])),
    [usuarios],
  );

  const userDependencyId = String(sessionUser?.id_dependencia || "").trim();
  const userRole = normalizeRole(sessionUser?.rol || sessionUser?.permiso);
  const isAdminOrSystems =
    userDependencyId === "0" ||
    userRole === "sistemas" ||
    userRole === "administrador";
  const isRegularUser = userRole === "usuario";

  const baseRows = useMemo(() => {
    return indicators.map((indicator) => ({
      ...indicator,
      dependencia: dependenciaById.get(String(indicator.id_dependencia)),
      respondeA: respondeAById.get(String(indicator.id_responde_a)),
      desafio: desafioById.get(String(indicator.id_desafio)),
      estrategiaConvergente: convergenteById.get(
        String(indicator.id_estrategia_convergente),
      ),
      estrategiaFacultad: facultadById.get(
        String(indicator.id_estrategia_facultad),
      ),
      programaInstitucional: programaById.get(
        String(indicator.id_programa_inst),
      ),
      indicadorResultado: resultadoById.get(
        String(indicator.id_indicador_resultado),
      ),
      periodo: periodoById.get(String(indicator.id_periodo)),
      meta: metaByIndicatorId.get(String(indicator.id)),
      avance: avanceByIndicatorId.get(String(indicator.id)),
      responsableUsuario: userById.get(String(indicator.responsable)),
    }));
  }, [
    indicators,
    dependenciaById,
    respondeAById,
    desafioById,
    convergenteById,
    facultadById,
    programaById,
    resultadoById,
    periodoById,
    metaByIndicatorId,
    avanceByIndicatorId,
    userById,
  ]);

  const visibleRows = useMemo(() => {
    if (isAdminOrSystems || !userDependencyId) return baseRows;
    return baseRows.filter(
      (row) => String(row.id_dependencia || "") === userDependencyId,
    );
  }, [baseRows, isAdminOrSystems, userDependencyId]);

  // Helper: apply all active filters to visibleRows EXCEPT the named field,
  // so each dropdown only shows options that are reachable given the other filters.
  const getRowsExcept = (excludeField) => {
    return visibleRows.filter((row) => {
      if (
        excludeField !== "dependencia" &&
        filters.dependencia &&
        String(row.id_dependencia || "") !== filters.dependencia
      )
        return false;

      if (
        excludeField !== "tipoDependencia" &&
        filters.tipoDependencia !== "TODAS" &&
        getTipoDependencia(row.dependencia) !== filters.tipoDependencia
      )
        return false;

      if (
        excludeField !== "respondeA" &&
        !matchesRespondeAFilter(
          row.id_responde_a,
          filters.respondeA,
          respondeAById,
        )
      )
        return false;

      if (
        excludeField !== "desafio" &&
        filters.desafio &&
        String(row.id_desafio || "") !== filters.desafio
      )
        return false;

      if (
        excludeField !== "estrategiaConvergente" &&
        filters.estrategiaConvergente &&
        String(row.id_estrategia_convergente || "") !==
          filters.estrategiaConvergente
      )
        return false;

      if (
        excludeField !== "estrategiaFacultad" &&
        filters.estrategiaFacultad &&
        String(row.id_estrategia_facultad || "") !== filters.estrategiaFacultad
      )
        return false;

      if (
        excludeField !== "programaInstitucional" &&
        filters.programaInstitucional &&
        String(row.id_programa_inst || "") !== filters.programaInstitucional
      )
        return false;

      if (
        excludeField !== "indicadorResultado" &&
        filters.indicadorResultado &&
        String(row.id_indicador_resultado || "") !== filters.indicadorResultado
      )
        return false;

      return true;
    });
  };

  const filterOptions = useMemo(() => {
    const depRows = getRowsExcept("dependencia");
    const raRows = getRowsExcept("respondeA");
    const desRows = getRowsExcept("desafio");
    const convRows = getRowsExcept("estrategiaConvergente");
    const facRows = getRowsExcept("estrategiaFacultad");
    const progRows = getRowsExcept("programaInstitucional");
    const resRows = getRowsExcept("indicadorResultado");

    const ids = (arr, key) => new Set(arr.map((r) => String(r[key] || "")));

    return {
      dependencias: sortById(
        dependencias.filter((item) =>
          ids(depRows, "id_dependencia").has(String(item.id)),
        ),
      ),
      respondeAs: sortById(
        respondeAs.filter((item) =>
          ids(raRows, "id_responde_a").has(String(item.id)),
        ),
      ),
      desafios: sortById(
        desafios.filter((item) =>
          ids(desRows, "id_desafio").has(String(item.id)),
        ),
      ),
      estrategiasConvergentes: sortById(
        estrategiasConvergentes.filter((item) =>
          ids(convRows, "id_estrategia_convergente").has(String(item.id)),
        ),
      ),
      estrategiasFacultad: sortById(
        estrategiasFacultad.filter((item) =>
          ids(facRows, "id_estrategia_facultad").has(String(item.id)),
        ),
      ),
      programasInstitucionales: sortById(
        programasInstitucionales.filter((item) =>
          ids(progRows, "id_programa_inst").has(String(item.id)),
        ),
      ),
      indicadoresResultado: sortById(
        indicadoresResultado.filter((item) =>
          resRows.some(
            (row) =>
              String(row.id_indicador_resultado || "") === String(item.id),
          ),
        ),
      ),
    };
  }, [
    visibleRows,
    dependencias,
    desafios,
    respondeAs,
    estrategiasConvergentes,
    estrategiasFacultad,
    programasInstitucionales,
    indicadoresResultado,
    filters,
    respondeAById,
  ]);

  const clearFilters = () => {
    setFilters({
      dependencia: "",
      tipoDependencia: "TODAS",
      respondeA: "",
      desafio: "",
      estrategiaConvergente: "",
      estrategiaFacultad: "",
      programaInstitucional: "",
      indicadorResultado: "",
    });
    setExpandedId(null);
  };

  const handleFilterChange = (field) => (event) => {
    const value = event.target.value;
    setFilters((prev) => ({ ...prev, [field]: value }));
    setExpandedId(null);
  };

  // filteredRows: visibleRows with ALL filters applied (used by JSX to render the list)
  const filteredRows = useMemo(
    () => sortIndicatorsByDependency(getRowsExcept(null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleRows, filters, respondeAById],
  );

  const refreshData = async () => {
    await onRefreshData?.();
  };

  const updateIndicator = async (id, payload, { reload = true } = {}) => {
    setBusyId(String(id));
    setActionError("");
    try {
      await updateSheetRow(SHEET_NAME, id, payload);
      if (reload) {
        await refreshData();
      }
    } catch (error) {
      setActionError(
        error?.response?.data?.message || "No se pudo actualizar el indicador.",
      );
    } finally {
      setBusyId("");
    }
  };

  const canEditAllIndicators = isAdminOrSystems;
  const currentUserId = String(sessionUser?.id || "");
  const isIndicatorOwnedByUser = (indicator) =>
    String(indicator.responsable || "") === currentUserId;

  const getSavedEvidenceUrl = (indicator) => {
    const evidencia = evidenciaByIndicatorId.get(String(indicator.id));
    const yearKey = `url_${EVIDENCE_YEAR}`;
    return String(evidencia?.[yearKey] ?? "");
  };

  const isEvidenceLinked = (indicator) =>
    isGoogleSheetsUrl(getSavedEvidenceUrl(indicator));

  const getEvidenceUrl = (indicator) => {
    const storedValue = evidenceUrls[String(indicator.id)];
    if (storedValue !== undefined) return storedValue;
    const evidencia = evidenciaByIndicatorId.get(String(indicator.id));
    const yearKey = `url_${EVIDENCE_YEAR}`;
    return String(
      evidencia?.[yearKey] ??
        indicator?.[EVIDENCE_URL_FIELD] ??
        indicator?.urlDocumentoEvidencia ??
        "",
    );
  };

  const openEvidenceSheet = (indicator) => {
    const url = getSavedEvidenceUrl(indicator) || getEvidenceUrl(indicator);
    if (!isGoogleSheetsUrl(url)) return;
    sessionStorage.setItem(
      LAST_EXPANDED_INDICATOR_KEY,
      String(indicator.id),
    );
    setSheetModalState({
      open: true,
      url,
      indicatorName: toText(indicator.nombre),
    });
  };

  const saveEvidenceUrl = async (indicator, nextValue) => {
    const trimmed = String(nextValue ?? "").trim();
    if (!trimmed) return;

    if (!isGoogleSheetsUrl(trimmed)) {
      throw new Error(
        "La URL de evidencia debe ser un enlace de Google Sheets.",
      );
    }

    const yearKey = `url_${EVIDENCE_YEAR}`;
    await saveEvidenceRow(String(indicator.id), yearKey, trimmed);
  };

  const handleEvidenceUrlChange = (indicatorId) => (event) => {
    const value = event.target.value;
    setEvidenceUrls((prev) => ({
      ...prev,
      [String(indicatorId)]: value,
    }));
  };

  const handleEvidenceUrlBlur = (indicator) => async () => {
    const nextValue = getEvidenceUrl(indicator).trim();
    if (!nextValue) return;

    if (!isGoogleSheetsUrl(nextValue)) {
      setActionError(
        "La URL de evidencia debe ser un enlace de Google Sheets.",
      );
      return;
    }
  };

  const handleLinkEvidence = async (indicator) => {
    const nextValue = getEvidenceUrl(indicator).trim();
    if (!nextValue) {
      setActionError("Escribe una URL antes de vincularla.");
      return;
    }

    if (!isGoogleSheetsUrl(nextValue)) {
      setActionError(
        "La URL de evidencia debe ser un enlace de Google Sheets.",
      );
      return;
    }

    setBusyId(`evidence-${indicator.id}`);
    setActionError("");
    try {
      await saveEvidenceUrl(indicator, nextValue);
      await refreshData();
    } catch (error) {
      setActionError(
        error?.response?.data?.message ||
          error.message ||
          "No se pudo vincular la URL de evidencia.",
      );
    } finally {
      setBusyId("");
    }
  };

  const handleEditIndicator = async (indicator, form) => {
    const indicatorPayload = { ...form };
    const nextEvidenceUrl = indicatorPayload.url_documento_evidencia;
    delete indicatorPayload.url_documento_evidencia;
    delete indicatorPayload.meta_2025;
    delete indicatorPayload.meta_2026;
    delete indicatorPayload.meta_2027;
    delete indicatorPayload.meta_2028;
    delete indicatorPayload.meta_2029;
    delete indicatorPayload.meta_2030;
    setBusyId(String(indicator.id));
    setActionError("");
    try {
      await updateSheetRow(SHEET_NAME, indicator.id, indicatorPayload);

      await saveMetaForIndicator(indicator.id, form);

      const trimmedUrl = String(nextEvidenceUrl ?? "").trim();
      const savedUrl = getSavedEvidenceUrl(indicator).trim();
      if (trimmedUrl !== savedUrl) {
        await saveEvidenceUrl(indicator, trimmedUrl);
      }

      await refreshData();
    } catch (error) {
      setActionError(
        error?.response?.data?.message ||
          error.message ||
          "No se pudo actualizar el indicador.",
      );
    } finally {
      setBusyId("");
    }
  };

  const closeSheetModal = () => {
    setSheetModalState({ open: false, url: "", indicatorName: "" });
    setLogroValues({});
    setEvidenceUrls({});
    void onRefreshData?.();
  };

  const getLogroValue = (indicator) => {
    const storedValue = logroValues[String(indicator.id)];
    if (storedValue !== undefined) return storedValue;
    return String(indicator?.logro ?? "");
  };

  const handleLogroChange = (indicatorId) => (event) => {
    const value = event.target.value;
    setLogroValues((prev) => ({
      ...prev,
      [String(indicatorId)]: value,
    }));

    const timerKey = String(indicatorId);
    if (logroSaveTimersRef.current[timerKey]) {
      clearTimeout(logroSaveTimersRef.current[timerKey]);
    }
    logroSaveTimersRef.current[timerKey] = setTimeout(() => {
      void (async () => {
        try {
          const nextValue = String(value ?? "").trim();
          if (!nextValue) {
            await updateIndicator(
              indicatorId,
              { logro: "" },
              { reload: false },
            );
            return;
          }
          await updateIndicator(
            indicatorId,
            { logro: nextValue },
            { reload: false },
          );
        } finally {
          delete logroSaveTimersRef.current[timerKey];
        }
      })();
    }, 900);
  };

  const handleLogroBlur = (indicator) => async () => {
    const timerKey = String(indicator.id);
    if (logroSaveTimersRef.current[timerKey]) {
      clearTimeout(logroSaveTimersRef.current[timerKey]);
      delete logroSaveTimersRef.current[timerKey];
    }
    const nextValue = getLogroValue(indicator).trim();
    const currentValue = String(indicator?.logro ?? "").trim();

    if (nextValue === currentValue) return;

    await updateIndicator(
      indicator.id,
      {
        logro: nextValue,
      },
      { reload: false },
    );
  };

  const buildMetaPayload = (indicatorId, payload) => {
    const metaFields = [
      "meta_2025",
      "meta_2026",
      "meta_2027",
      "meta_2028",
      "meta_2029",
      "meta_2030",
    ];
    const metaPayload = {
      id_indicador_producto: String(indicatorId),
    };

    metaFields.forEach((field) => {
      const value = payload?.[field];
      if (value !== "" && value !== undefined && value !== null) {
        metaPayload[field] = Number(value);
      }
    });

    return metaPayload;
  };

  const buildEditableMetaPayload = (indicatorId, payload) => {
    const metaFields = [
      "meta_2025",
      "meta_2026",
      "meta_2027",
      "meta_2028",
      "meta_2029",
      "meta_2030",
    ];
    const metaPayload = {
      id_indicador_producto: String(indicatorId),
    };

    metaFields.forEach((field) => {
      const value = payload?.[field];
      metaPayload[field] = value === undefined || value === null ? "" : value;
    });

    return metaPayload;
  };

  const getNextRespondeAId = () => {
    const maxId = respondeAs.reduce((max, item) => {
      const current = Number(item?.id ?? 0);
      return Number.isFinite(current) && current > max ? current : max;
    }, 0);
    return String(maxId + 1);
  };

  const saveMetaForIndicator = async (indicatorId, payload) => {
    const metaPayload = buildEditableMetaPayload(indicatorId, payload);
    const existingMeta = metaByIndicatorId.get(String(indicatorId));
    const hasAnyValue = Object.keys(metaPayload).some(
      (key) => key !== "id_indicador_producto" && metaPayload[key] !== "",
    );

    if (existingMeta?.id) {
      await updateSheetRow(META_SHEET_NAME, existingMeta.id, metaPayload);
      return;
    }

    if (hasAnyValue) {
      await createSheetRow(META_SHEET_NAME, metaPayload);
    }
  };

  const createRespondeA = async (name) => {
    const fallbackId = getNextRespondeAId();
    const response = await createSheetRow("RESPONDE_A", {
      id: fallbackId,
      nombre: name,
    });
    const respondeAId = getCreatedIndicatorId(response) || fallbackId;
    if (!respondeAId) {
      throw new Error("No se pudo obtener el id del nuevo responde a.");
    }
    return { id: respondeAId, nombre: name };
  };

  const getCreatedIndicatorId = (responseData) => {
    console.log("Create response data:", responseData);
    if (!responseData) return "";
    if (typeof responseData === "string" || typeof responseData === "number") {
      return String(responseData);
    }
    if (Array.isArray(responseData)) {
      const first = responseData[0];
      console.log("First item in array:", first);
      return String(
        first?.id ??
          first?.insertId ??
          first?.insertedId ??
          first?.data?.id ??
          "",
      );
    }
    if (typeof responseData === "object") {
      const candidates = [
        responseData?.id,
        responseData?.insertId,
        responseData?.insertedId,
        responseData?.data?.id,
        responseData?.data?.insertId,
        responseData?.data?.insertedId,
      ];
      for (const candidate of candidates) {
        if (
          candidate !== undefined &&
          candidate !== null &&
          String(candidate).trim()
        ) {
          return String(candidate);
        }
      }
      if (Array.isArray(responseData?.data) && responseData.data.length) {
        const first = responseData.data[0];
        return String(first?.id ?? first?.insertId ?? first?.insertedId ?? "");
      }
    }
    return String(
      responseData?.id ??
        responseData?.insertId ??
        responseData?.insertedId ??
        responseData?.data?.id ??
        "",
    );
  };

  const createIndicator = async (payload) => {
    setBusyId("create");
    setActionError("");
    try {
      const indicatorPayload = { ...payload };
      const metaFields = [
        "meta_2025",
        "meta_2026",
        "meta_2027",
        "meta_2028",
        "meta_2029",
        "meta_2030",
      ];
      indicatorPayload.suma_facultad =
        indicatorPayload.suma_facultad === true ||
        String(indicatorPayload.suma_facultad).toLowerCase() === "true";
      const shouldCreateRespondeA = Boolean(indicatorPayload.create_responde_a);
      const respondeAName = String(
        indicatorPayload.responde_a_nombre ?? "",
      ).trim();

      if (shouldCreateRespondeA) {
        if (!respondeAName) {
          throw new Error("Debes escribir el nombre de RESPONDE_A.");
        }
        const respondeA = await createRespondeA(respondeAName);
        indicatorPayload.id_responde_a = respondeA.id;
      }

      delete indicatorPayload.create_responde_a;
      delete indicatorPayload.responde_a_nombre;
      metaFields.forEach((field) => {
        delete indicatorPayload[field];
      });

      const indicatorResponse = await createSheetRow(
        SHEET_NAME,
        indicatorPayload,
      );
      console.log("Create response:", indicatorResponse);
      const indicatorId = getCreatedIndicatorId(indicatorResponse);
      const metaPayload = buildMetaPayload(indicatorId, payload);
      console.log("Meta payload:", metaPayload);
      if (indicatorId && Object.keys(metaPayload).length > 1) {
        await createSheetRow(META_SHEET_NAME, metaPayload);
        console.log(
          "Meta created for indicator ID:",
          indicatorId,
          "with payload:",
          metaPayload,
        );
      }
      setCreateOpen(false);
      await refreshData();
    } catch (error) {
      setActionError(
        error?.response?.data?.message || "No se pudo crear el indicador.",
      );
      console.error("Error creating indicator:", error);
      console.log("Payload:", payload);
      console.log("API URL:", import.meta.env.VITE_API_BASE);
    } finally {
      setBusyId("");
    }
  };

  const removeIndicator = async (indicator) => {
    if (!window.confirm(`Eliminar el indicador "${toText(indicator.nombre)}"?`))
      return;
    setBusyId(String(indicator.id));
    setActionError("");
    try {
      await deleteSheetRow(SHEET_NAME, indicator.id);
      setDetailsState({ open: false, indicator: null });
      await refreshData();
    } catch (error) {
      setActionError(
        error?.response?.data?.message || "No se pudo eliminar el indicador.",
      );
    } finally {
      setBusyId("");
    }
  };

  if (!data) {
    return <Typography sx={{ mt: 2 }}>Cargando informacion...</Typography>;
  }

  return (
    <Box className="indicators-page">
      <Paper className="filters-panel" elevation={1}>
        <Box className="filters-header">
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Indicadores producto ({filteredRows.length})
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {filteredRows.length} de {visibleRows.length} indicadores visibles
            </Typography>
          </Box>
          {canEditAllIndicators && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
            >
              Crear indicador
            </Button>
          )}
          <Button variant="outlined" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </Box>

        <Box className="filters-grid">
          <FormControl size="small" fullWidth>
            <InputLabel>Dependencia</InputLabel>
            <Select
              value={filters.dependencia}
              label="Dependencia"
              onChange={handleFilterChange("dependencia")}
            >
              <MenuItem value="">Todas</MenuItem>
              {filterOptions.dependencias.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.nombre)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Desafio</InputLabel>
            <Select
              value={filters.desafio}
              label="Desafio"
              onChange={handleFilterChange("desafio")}
            >
              <MenuItem value="">Todos</MenuItem>
              {filterOptions.desafios.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.titulo)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Estrategia convergente</InputLabel>
            <Select
              value={filters.estrategiaConvergente}
              label="Estrategia convergente"
              onChange={handleFilterChange("estrategiaConvergente")}
            >
              <MenuItem value="">Todas</MenuItem>
              {filterOptions.estrategiasConvergentes.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.titulo)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Estrategia facultad</InputLabel>
            <Select
              value={filters.estrategiaFacultad}
              label="Estrategia facultad"
              onChange={handleFilterChange("estrategiaFacultad")}
            >
              <MenuItem value="">Todas</MenuItem>
              {filterOptions.estrategiasFacultad.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.titulo)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Programa institucional</InputLabel>
            <Select
              value={filters.programaInstitucional}
              label="Programa institucional"
              onChange={handleFilterChange("programaInstitucional")}
            >
              <MenuItem value="">Todos</MenuItem>
              {filterOptions.programasInstitucionales.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.titulo)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Indicador resultado</InputLabel>
            <Select
              value={filters.indicadorResultado}
              label="Indicador resultado"
              onChange={handleFilterChange("indicadorResultado")}
            >
              <MenuItem value="">Todos</MenuItem>
              {filterOptions.indicadoresResultado.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.nombre)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box className="filters-secondary-row">
          <FormControl className="filter-radio-group-block">
            <Typography className="radio-group-title">
              Tipo de dependencia
            </Typography>
            <RadioGroup
              row
              value={filters.tipoDependencia}
              onChange={handleFilterChange("tipoDependencia")}
            >
              <FormControlLabel
                value="TODAS"
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
          <FormControl className="filter-radio-group-block">
            <Typography className="radio-group-title">Responde a</Typography>
            <RadioGroup
              row
              value={filters.respondeA}
              onChange={handleFilterChange("respondeA")}
            >
              <FormControlLabel
                value=""
                control={<Radio size="small" />}
                label="Todas"
              />
              <FormControlLabel
                value="MT"
                control={<Radio size="small" />}
                label="MT"
              />
              <FormControlLabel
                value="CNA"
                control={<Radio size="small" />}
                label="CNA"
              />
              <FormControlLabel
                value="DEP"
                control={<Radio size="small" />}
                label="DEP"
              />
            </RadioGroup>
          </FormControl>
        </Box>
      </Paper>

      <Paper className="indicator-list-header" elevation={1}>
        <Typography className="summary-title" sx={{ fontWeight: 700 }}>
          ID
        </Typography>
        <Typography className="summary-title" sx={{ fontWeight: 700 }}>
          Nombre
        </Typography>
        <Typography
          className="summary-title indicator-summary-dependency"
          sx={{ fontWeight: 700 }}
        >
          Dependencia
        </Typography>
        <Typography
          className="summary-title indicator-summary-dependency"
          sx={{ fontWeight: 700 }}
        >
          Avance
        </Typography>
      </Paper>

      {filteredRows.map((indicator) => {
        const isExpanded = String(expandedId) === String(indicator.id);
        return (
          <Accordion
            key={indicator.id}
            className="indicator-accordion"
            expanded={isExpanded}
            data-indicator-id={String(indicator.id)}
            onChange={(_, expanded) =>
              setExpandedId(expanded ? String(indicator.id) : null)
            }
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box
                className="indicator-summary-grid"
                sx={{
                  bgcolor: isIndicatorOwnedByUser(indicator)
                    ? "grey.800"
                    : "transparent",
                  color: isIndicatorOwnedByUser(indicator)
                    ? "common.white"
                    : "inherit",
                  borderRadius: 1,
                  px: 1,
                  py: 0.5,
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>
                  {toText(indicator.id)}
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {toText(indicator.nombre)}
                </Typography>
                <Typography
                  sx={{ fontWeight: 700 }}
                  className="indicator-summary-dependency"
                >
                  {toText(indicator.dependencia?.nombre)}
                </Typography>
                <Typography
                  sx={{ fontWeight: 700 }}
                  className="indicator-summary-dependency"
                >
                  {getAvanceDisplay(
                    indicator.avance?.avance_2026,
                    indicator.meta?.meta_2026,
                  )}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer
                component={Paper}
                sx={{ mt: 2, backgroundColor: "grey.100" }}
                variant="outlined"
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900, fontSize: "15px" }}>
                        Concepto
                      </TableCell>
                      <TableCell sx={{ fontWeight: 900, fontSize: "15px" }}>
                        Tipo
                      </TableCell>
                      <TableCell sx={{ fontWeight: 900, fontSize: "15px" }}>
                        2026
                      </TableCell>
                      <TableCell sx={{ fontWeight: 900, fontSize: "15px" }}>
                        Total trienio
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900, fontSize: "15px" }}>
                        Meta
                      </TableCell>
                      <TableCell sx={{ fontSize: "15px" }}>
                        {toText(indicator.meta?.tipo)}
                      </TableCell>
                      <TableCell sx={{ fontSize: "15px" }}>
                        {toText(indicator.meta?.meta_2026)}
                      </TableCell>
                      <TableCell sx={{ fontSize: "15px" }}>
                        {toText(indicator.meta?.total_trienio)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900, fontSize: "15px" }}>
                        Avance
                      </TableCell>
                      <TableCell sx={{ fontSize: "15px" }}>
                        Porcentaje
                      </TableCell>
                      <TableCell sx={{ fontSize: "15px" }}>
                        {getAvanceDisplay(
                          indicator.avance?.avance_2026,
                          indicator.meta?.meta_2026,
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: "15px" }}>
                        {toText(indicator.avance?.total_trienio || "-")}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <Box
                sx={{
                  mt: 2,
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 2,
                  alignItems: "start",
                }}
              >
                <Box sx={{ width: "100%" }}>
                  {isEvidenceLinked(indicator) ? (
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Tooltip title="Abrir sheet de evidencia">
                        <Typography
                          component="span"
                          onClick={() => openEvidenceSheet(indicator)}
                          sx={{
                            flex: 1,
                            color: "primary.main",
                            textDecoration: "underline",
                            cursor: "pointer",
                            "&:hover": { color: "primary.dark" },
                            width: "50%",
                          }}
                        >
                          URL documento evidencia
                        </Typography>
                      </Tooltip>
                      {canEditAllIndicators && (
                        <Tooltip title="La URL ya está vinculada">
                          <span>
                            <Button variant="contained" disabled>
                              Vincular
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </Box>
                  ) : (
                    <>
                      <Typography className="detail-label" sx={{ mb: 1 }}>
                        URL documento evidencia
                      </Typography>
                      <Box
                        sx={{
                          width: "415%",
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="URL del documento de evidencia"
                          value={getEvidenceUrl(indicator)}
                          onChange={handleEvidenceUrlChange(indicator.id)}
                          onBlur={handleEvidenceUrlBlur(indicator)}
                          disabled={!canEditAllIndicators}
                          sx={{ width: "100%" }}
                        />
                        {canEditAllIndicators && (
                          <Box
                            sx={{ display: "flex", justifyContent: "flex-end" }}
                          >
                            <Tooltip title="Vincular URL de evidencia">
                              <span>
                                <Button
                                  variant="contained"
                                  onClick={() => handleLinkEvidence(indicator)}
                                  disabled={
                                    busyId === `evidence-${indicator.id}`
                                  }
                                >
                                  Vincular
                                </Button>
                              </span>
                            </Tooltip>
                          </Box>
                        )}
                      </Box>
                    </>
                  )}
                </Box>
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Typography className="detail-label" sx={{ mb: 1 }}>
                    Descripción de Logro
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={4}
                    placeholder="Logro"
                    value={getLogroValue(indicator)}
                    onChange={handleLogroChange(indicator.id)}
                    onBlur={handleLogroBlur(indicator)}
                  />
                </Box>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 1,
                  mt: 2,
                  mb: 2,
                  flexWrap: "wrap",
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => setDetailsState({ open: true, indicator })}
                >
                  Ver detalles
                </Button>
                {canEditAllIndicators ? (
                  <>
                    <Button
                      variant="contained"
                      onClick={() => setEditState({ open: true, indicator })}
                    >
                      Editar
                    </Button>
                    <Button
                      color="error"
                      variant="outlined"
                      onClick={() => removeIndicator(indicator)}
                    >
                      Eliminar
                    </Button>
                  </>
                ) : null}
              </Box>
              <Box className="indicator-detail-grid">
                <Paper
                  className="detail-item"
                  elevation={0}
                  size="small"
                  sx={{ p: 1, minHeight: "auto" }}
                >
                  <Typography className="detail-label">Desafio</Typography>
                  <Typography
                    className="detail-value"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2, // Cambia a 2 o más si quieres permitir más líneas antes del corte
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {toText(indicator.desafio?.titulo)}
                  </Typography>
                </Paper>
                <Paper
                  className="detail-item"
                  elevation={0}
                  size="small"
                  sx={{ p: 1, minHeight: "auto" }}
                >
                  <Typography className="detail-label">
                    Estrategia convergente
                  </Typography>
                  <Typography
                    className="detail-value"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2, // Cambia a 2 o más si quieres permitir más líneas antes del corte
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {toText(indicator.estrategiaConvergente?.titulo)}
                  </Typography>
                </Paper>
                <Paper
                  className="detail-item"
                  elevation={0}
                  size="small"
                  sx={{ p: 1, minHeight: "auto" }}
                >
                  <Typography className="detail-label">
                    Estrategia facultad
                  </Typography>
                  <Typography
                    className="detail-value"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2, // Cambia a 2 o más si quieres permitir más líneas antes del corte
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {toText(indicator.estrategiaFacultad?.titulo)}
                  </Typography>
                </Paper>
                <Paper
                  className="detail-item"
                  elevation={0}
                  size="small"
                  sx={{ p: 1, minHeight: "auto" }}
                >
                  <Typography className="detail-label">
                    Programa institucional
                  </Typography>
                  <Typography
                    className="detail-value"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2, // Cambia a 2 o más si quieres permitir más líneas antes del corte
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {toText(indicator.programaInstitucional?.titulo)}
                  </Typography>
                </Paper>
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}

      {!filteredRows.length && (
        <Paper className="empty-filters-state" elevation={0}>
          <Typography>
            No se encontraron indicadores con los filtros seleccionados.
          </Typography>
        </Paper>
      )}

      {actionError && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography color="error">{actionError}</Typography>
        </Paper>
      )}

      <CreateIndicator
        open={createOpen}
        loading={busyId === "create"}
        dependencias={dependencias}
        desafios={desafios}
        estrategiasConvergentes={estrategiasConvergentes}
        estrategiasFacultad={estrategiasFacultad}
        programasInstitucionales={programasInstitucionales}
        indicadoresResultado={indicadoresResultado}
        respondeAs={respondeAs}
        onCreateRespondeA={createRespondeA}
        usuarios={usuarios}
        periodos={periodos}
        metas={metas}
        onClose={() => setCreateOpen(false)}
        onSubmit={createIndicator}
      />

      <EditModal
        open={editState.open}
        loading={busyId === String(editState.indicator?.id)}
        indicator={editState.indicator}
        evidenceUrl={
          editState.indicator ? getEvidenceUrl(editState.indicator) : ""
        }
        dependencias={dependencias}
        desafios={desafios}
        estrategiasConvergentes={estrategiasConvergentes}
        estrategiasFacultad={estrategiasFacultad}
        programasInstitucionales={programasInstitucionales}
        indicadoresResultado={indicadoresResultado}
        respondeAs={respondeAs}
        usuarios={usuarios}
        metas={metas}
        periodos={[]}
        onClose={() => setEditState({ open: false, indicator: null })}
        onSubmit={(payload) =>
          handleEditIndicator(editState.indicator, payload)
        }
      />

      <ModalDetails
        open={detailsState.open}
        indicator={detailsState.indicator}
        dependencias={dependencias}
        desafios={desafios}
        estrategiasConvergentes={estrategiasConvergentes}
        estrategiasFacultad={estrategiasFacultad}
        programasInstitucionales={programasInstitucionales}
        indicadoresResultado={indicadoresResultado}
        respondeAs={respondeAs}
        usuarios={usuarios}
        periodos={periodos}
        onClose={() => setDetailsState({ open: false, indicator: null })}
      />

      <Dialog
        open={sheetModalState.open}
        onClose={closeSheetModal}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            width: "min(96vw, 1500px)",
            height: "min(92vh, 920px)",
          },
        }}
      >
        <DialogTitle sx={{ pr: 8 }}>
          {sheetModalState.indicatorName || "Sheet de evidencia"}
        </DialogTitle>
        <IconButton
          aria-label="Cerrar sheet"
          onClick={closeSheetModal}
          sx={{ position: "absolute", top: 10, right: 10, zIndex: 1 }}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent sx={{ p: 0, height: "100%" }}>
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: "100%",
              overflow: "hidden",
              bgcolor: "grey.100",
            }}
          >
            <iframe
              title={sheetModalState.indicatorName || "Sheet de evidencia"}
              src={getSheetEmbedUrl(sheetModalState.url)}
              style={{
                position: "absolute",
                top: "-24px",
                left: "-44px",
                width: "calc(101.1% + 44px)",
                height: "calc(150% + 24px)",
                border: "none",
              }}
              loading="lazy"
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default IndicatorsPage;
