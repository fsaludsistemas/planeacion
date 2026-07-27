import React, { useEffect, useMemo, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const toolbarOptions = [
  ["bold", "italic", "underline", "strike"],
  [{ header: 1 }, { header: 2 }],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ align: [] }],
  ["link", "blockquote", "clean"],
];

const DEFAULT_EMAIL_HTML = `<p>Cordial saludo esta es la plantilla de prueba,</p>
		<p>Estimado profesor(a)s, </p>
		<p>Para la Oficina de Planeacion de la Facultad de Salud es grato apoyar los procesos orientados al establecimiento de los indicadores, los cuales contribuyen al fortalecimiento de la planeacion universitaria.</p>
		<p>Adjuntamos documento donde se detalla el proceso para la creacion de indicadores para la plataforma de planeacion de la Facultad de Salud</a>.</p>
		<p>Cualquier inquietud con gusto la atenderemos.</p>
		<p>Cordialmente,</p>
		<p style="margin:0px;" ><strong>Usuario prueba</strong></p>
		<p style="margin:0px;">Coordinadora</p>
		<p style="margin:0px;">Oficina de Planeacion - Facultad de Salud</p>

			<p style="margin-bottom:0px;"><strong>Usuario de prueba</strong></p>
			<p style="margin:0px;">Profesional</p>
			<p style="margin:0px;">Oficina de Planeacion - Facultad de Salud</p>
			<p style="margin:0px;">Número telefónico: (57 - 602) 3212100 Ext. 4072</p>
			<p style="margin:0px;">https://internacionalessalud.univalle.edu.co/movilidad-internacional</p>

			<p style="margin:0px;" >Horario de atención:</p>
			<p style="margin:0px;" >Lunes a Viernes de 8:00 a.m. a 12:00 m. - 2:00 p.m. a 5:00 p.m.</p>
			<p style="margin:0px;" > Hora Colombia, Bogotá GMT-5 </p>
			 <p><strong>AVISO LEGAL:</strong> Este mensaje y/o sus anexos son confidenciales y para uso exclusivo de su destinatario intencional. Si usted no es el destinatario, le informamos que no podrá use, retener, imprimir, copiar, distribuir o hacer público su contenido. Cualquier retención, revisión no autorizada, distribución, divulgación, reenvío, copia, impresión, reproducción o uso indebido de este mensaje y/o anexos, esté estrictamente prohibida y sancionada de acuerdo con la Ley 1273 de enero del 2009. Si ha recibido este correo por error, por favor elimínelo e infórmenos al correo internasalud@correounivalle.edu.co Si usted es el destinatario, le solicitamos mantener reserva sobre el contenido, los datos o información de contacto del remitente y en general sobre la información de este documento y/o archivos adjuntos, a no ser que exista una autorización explícita</p>.`;
const EmailComposerDialog = ({
  open,
  users = [],
  loading = false,
  onClose,
  onSend,
}) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const [subject, setSubject] = useState("");
  const [error, setError] = useState("");
  const [htmlPreview, setHtmlPreview] = useState("");

  const recipients = useMemo(
    () => users.map((user) => String(user?.correo ?? "")).filter(Boolean),
    [users],
  );

  useEffect(() => {
    if (!open) return undefined;

    setSubject("");
    setError("");
    setHtmlPreview("");

    const timer = window.setTimeout(() => {
      if (!editorRef.current) return;

      if (quillRef.current) {
        quillRef.current = null;
      }
      editorRef.current.innerHTML = "";
      const quill = new Quill(editorRef.current, {
        theme: "snow",
        modules: {
          toolbar: toolbarOptions,
        },
        placeholder: "Escribe el contenido del correo...",
      });

      quill.clipboard.dangerouslyPasteHTML(DEFAULT_EMAIL_HTML);
      const updatePreview = () => setHtmlPreview(quill.root.innerHTML);
      quill.on("text-change", updatePreview);
      quillRef.current = quill;
      updatePreview();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      quillRef.current = null;
    };
  }, [open]);

  const handleSend = async () => {
    const html = quillRef.current?.root?.innerHTML?.trim() || "";
    if (!recipients.length) {
      setError("Selecciona al menos un usuario.");
      return;
    }
    if (!subject.trim()) {
      setError("Escribe un asunto.");
      return;
    }
    if (!html) {
      setError("El cuerpo del correo no puede estar vacío.");
      return;
    }

    setError("");
    await onSend({
      to: recipients,
      subject: subject.trim(),
      html,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Enviar correo</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Destinatarios
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {recipients.map((email) => (
                <Chip key={email} label={email} size="small" />
              ))}
            </Stack>
          </Box>

          <TextField
            fullWidth
            label="Asunto"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Plantilla editable
            </Typography>
            <Box
              ref={editorRef}
              sx={{
                backgroundColor: "#fff",
                borderRadius: 2,
                overflow: "hidden",
                "& .ql-toolbar": {
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                },
                "& .ql-container": {
                  minHeight: 240,
                  fontSize: "1rem",
                },
              }}
            />
          </Box>

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: "action.hover",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Vista actual del correo
            </Typography>
            <Box
              sx={{ mt: 1, fontSize: "0.9rem" }}
              dangerouslySetInnerHTML={{ __html: htmlPreview }}
            />
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSend} disabled={loading}>
          Enviar correo
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailComposerDialog;
