'use client';

import jsPDF from 'jspdf';
import type { AttemptDto, SimulationDto } from '@senlabvisa/shared-types';

export type ReportUser = {
  identifier: string;
  fullName: string;
};

/**
 * Génère un PDF de rapport TP pour l'élève.
 *
 * Inclut : en-tête Sen Lab Visa + identité élève + TP + score + commentaire
 * teacher s'il y en a + dataJson formaté + date.
 */
export function generateAttemptReport(
  attempt: AttemptDto,
  simulation: SimulationDto,
  user: ReportUser,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 16;

  // Header bandeau violet
  doc.setFillColor(124, 58, 237); // violet-600
  doc.rect(0, 0, W, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SEN LAB VISA', margin, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Plateforme STEM Sénégal · Rapport de TP', margin, 18);

  // Date à droite
  const dateStr = new Date(attempt.createdAt).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(dateStr, W - margin, 18, { align: 'right' });

  // Titre TP
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(simulation.title, margin, 38);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${simulation.subject} · ${simulation.targetGrade}`, margin, 45);

  // Identité élève
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Élève :', margin, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(user.fullName ?? user.identifier, margin + 22, 60);
  if (user.identifier) {
    doc.setTextColor(120, 120, 120);
    doc.text(`(${user.identifier})`, margin + 22 + doc.getTextWidth(user.fullName ?? '') + 4, 60);
  }

  // Score (encart violet)
  doc.setFillColor(245, 243, 255); // violet-50
  doc.roundedRect(margin, 68, W - 2 * margin, 28, 3, 3, 'F');
  doc.setTextColor(124, 58, 237);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SCORE', margin + 6, 76);
  doc.setFontSize(28);
  doc.text(`${attempt.score ?? '—'} / 100`, margin + 6, 90);

  // Statut
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const statut =
    attempt.status === 'completed'
      ? '✓ Terminé'
      : attempt.status === 'started'
        ? '⏳ Démarré'
        : '✗ Échec';
  doc.text(`Statut : ${statut}`, W - margin - 50, 76);
  if (attempt.publishedAt) {
    doc.text('✓ Note publiée par le professeur', W - margin - 50, 84);
  }

  // Commentaire teacher
  let y = 110;
  if (attempt.teacherComment) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Commentaire du professeur', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(attempt.teacherComment, W - 2 * margin);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 6;
  }

  // Données du TP (dataJson formaté)
  if (attempt.dataJson && Object.keys(attempt.dataJson).length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Détails de la session', margin, y);
    y += 6;
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const json = JSON.stringify(attempt.dataJson, null, 2);
    const lines = doc.splitTextToSize(json, W - 2 * margin);
    const maxLines = Math.floor((280 - y) / 4); // garder de la place pour le footer
    doc.text(lines.slice(0, maxLines), margin, y);
    if (lines.length > maxLines) {
      y += maxLines * 4;
      doc.text(`... (${lines.length - maxLines} lignes supplémentaires)`, margin, y);
    }
  }

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Sen Lab Visa · Plateforme STEM open source · Programme sénégalais', W / 2, 290, {
    align: 'center',
  });

  // Sauvegarde
  const filename = `rapport-${simulation.slug}-${user.identifier?.replace(/\//g, '_') ?? 'eleve'}-${new Date(attempt.createdAt).toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
