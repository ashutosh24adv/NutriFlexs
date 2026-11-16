"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Camera,
  UploadCloud,
  X,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Info,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Search,
  Flame,
  Scale,
  ShieldCheck,
  HelpCircle,
  Maximize2,
  ArrowRight,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MealType } from "@prisma/client";
import { ConfirmedFoodAnalysisItem } from "@/app/api/nutrition/analyze-image/route";
import { addGuestLog } from "@/lib/guest-nutrition";

interface AIMealScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMealType?: MealType;
  dateKey: string;
  onScanSuccess?: () => void;
}

const SERVING_UNIT_OPTIONS = [
  { value: "medium_bowl", label: "Medium Bowl (180g)", defaultGrams: 180 },
  { value: "small_bowl", label: "Small Bowl / Katori (110g)", defaultGrams: 110 },
  { value: "large_bowl", label: "Large Bowl (280g)", defaultGrams: 280 },
  { value: "piece", label: "Piece / Roti (40g)", defaultGrams: 40 },
  { value: "plate", label: "Full Plate (250g)", defaultGrams: 250 },
  { value: "cup", label: "Cup (220g)", defaultGrams: 220 },
  { value: "g", label: "Grams (g)", defaultGrams: 1 },
  { value: "ml", label: "Millilitres (ml)", defaultGrams: 1 },
];

export function AIMealScannerModal({
  isOpen,
  onClose,
  initialMealType = MealType.LUNCH,
  dateKey,
  onScanSuccess,
}: AIMealScannerModalProps) {
  const { data: session } = useSession();
  const isGuest = !session?.user?.email;

  // Step state: "upload" | "scanning" | "analysis" | "success"
  const [step, setStep] = useState<"upload" | "scanning" | "analysis" | "success">("upload");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageMetadata, setImageMetadata] = useState<{ name: string; sizeKb: number; type: string } | null>(null);

  // Analysis result state
  const [mealTitle, setMealTitle] = useState<string>("Your Meal Analysis");
  const [selectedMealType, setSelectedMealType] = useState<MealType>(initialMealType);
  const [detectedItems, setDetectedItems] = useState<ConfirmedFoodAnalysisItem[]>([]);
  const [errorBanner, setErrorBanner] = useState<{ message: string; isConfigError?: boolean } | null>(null);

  // Missing food search state
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingFoods, setIsSearchingFoods] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [scanMessage, setScanMessage] = useState("Examining plate geometry & visible dishes...");

  // Refs for file inputs
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setStep("upload");
      setSelectedImage(null);
      setImagePreviewUrl(null);
      setImageMetadata(null);
      setDetectedItems([]);
      setErrorBanner(null);
      setSelectedMealType(initialMealType);
      setIsAddingFood(false);
    }
  }, [isOpen, initialMealType]);

  // Handle file selection
  const handleFileSelect = (file: File) => {
    setErrorBanner(null);

    // Validate size (max 8MB)
    const MAX_SIZE = 8 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorBanner({
        message: `Image exceeds 8MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB). Please choose a smaller photo.`,
      });
      return;
    }

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setErrorBanner({
        message: "Unsupported file format. Please upload a JPEG, PNG, or WebP photo.",
      });
      return;
    }

    setSelectedImage(file);
    setImageMetadata({
      name: file.name,
      sizeKb: Math.round(file.size / 1024),
      type: file.type.replace("image/", "").toUpperCase(),
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Perform AI Analysis via /api/nutrition/analyze-image
  const handleAnalyzeImage = async (forceSimulate = false) => {
    if (!selectedImage && !forceSimulate) return;

    setErrorBanner(null);
    setStep("scanning");

    // Cycling scanning status messages
    const messages = [
      "Examining plate geometry & visible dishes...",
      "Separating components & identifying gravies...",
      "Cross-referencing NutriFlexs Indian food database...",
      "Computing authoritative macro totals...",
    ];
    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      setScanMessage(messages[msgIdx]);
    }, 1200);

    try {
      let res: Response;

      if (forceSimulate) {
        // Sample demonstration thali
        res = await fetch("/api/nutrition/analyze-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-mock-meal-analysis": "true",
          },
          body: JSON.stringify({
            simulateSample: true,
            // Minimal valid 1x1 base64 png
            imageBase64:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          }),
        });
      } else {
        const formData = new FormData();
        formData.append("image", selectedImage!);

        res = await fetch("/api/nutrition/analyze-image", {
          method: "POST",
          body: formData,
        });
      }

      clearInterval(interval);

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === "MISSING_GEMINI_API_KEY" || res.status === 503) {
          setErrorBanner({
            message:
              data.error ||
              "Gemini API key is not configured on the server. Please set the GEMINI_API_KEY environment variable to enable AI meal scanning.",
            isConfigError: true,
          });
          setStep("upload");
          return;
        }

        setErrorBanner({
          message: data.error || "Failed to analyze meal image. Please try again.",
        });
        setStep("upload");
        return;
      }

      setMealTitle(data.mealTitle || "Your Meal Analysis");
      setDetectedItems(data.detectedItems || []);
      setStep("analysis");
    } catch (err: any) {
      clearInterval(interval);
      console.error("AI Analysis failed:", err);
      setErrorBanner({
        message: "Network or server connection failed. Please check your connection and retry.",
      });
      setStep("upload");
    }
  };

  // Recalculate item macros live when quantity or unit changes
  // Formula: Nutrition = Nutrition per 100g × Selected quantity in grams / 100
  const handleUpdateItemQuantity = (id: string, newQuantity: number) => {
    const qty = Math.max(0.1, Math.round(newQuantity * 10) / 10);
    setDetectedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const gramsPerUnit = item.grams / (item.quantity || 1) || 100;
        const totalGrams = Math.round(qty * gramsPerUnit * 10) / 10;
        const factor = totalGrams / 100;

        return {
          ...item,
          quantity: qty,
          grams: totalGrams,
          calories: Math.round(item.caloriesPer100g * factor * 10) / 10,
          protein: Math.round(item.proteinPer100g * factor * 10) / 10,
          carbohydrates: Math.round(item.carbsPer100g * factor * 10) / 10,
          fat: Math.round(item.fatPer100g * factor * 10) / 10,
        };
      })
    );
  };

  const handleUpdateItemUnit = (id: string, newUnit: string) => {
    const unitOption = SERVING_UNIT_OPTIONS.find((u) => u.value === newUnit);
    const unitGrams = unitOption ? unitOption.defaultGrams : 100;

    setDetectedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const totalGrams = Math.round(item.quantity * unitGrams * 10) / 10;
        const factor = totalGrams / 100;

        return {
          ...item,
          unit: newUnit,
          grams: totalGrams,
          calories: Math.round(item.caloriesPer100g * factor * 10) / 10,
          protein: Math.round(item.proteinPer100g * factor * 10) / 10,
          carbohydrates: Math.round(item.carbsPer100g * factor * 10) / 10,
          fat: Math.round(item.fatPer100g * factor * 10) / 10,
        };
      })
    );
  };

  const handleUpdateItemName = (id: string, newName: string) => {
    setDetectedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, displayName: newName } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setDetectedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Search and add missing food item
  const handleSearchFoods = async (q: string) => {
    setFoodSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearchingFoods(true);
    try {
      const res = await fetch(`/api/nutrition/foods?q=${encodeURIComponent(q.trim())}&limit=5`);
      const data = await res.json();
      if (data.success && data.foods) {
        setSearchResults(data.foods);
      }
    } catch (err) {
      console.error("Food search error:", err);
    } finally {
      setIsSearchingFoods(false);
    }
  };

  const handleAddFoodFromSearch = (food: any) => {
    const newItem: ConfirmedFoodAnalysisItem = {
      id: `manual_${Date.now()}`,
      detectedName: food.name,
      displayName: food.name,
      category: food.category,
      foodItemId: food.id,
      foodVariantId: null,
      isGravy: false,
      quantity: 1,
      unit: food.defaultServingUnit || "medium_bowl",
      grams: food.servingWeightGrams || 100,
      calories: Math.round(food.caloriesPer100g * ((food.servingWeightGrams || 100) / 100) * 10) / 10,
      protein: Math.round(food.protein * ((food.servingWeightGrams || 100) / 100) * 10) / 10,
      carbohydrates: Math.round(food.carbohydrates * ((food.servingWeightGrams || 100) / 100) * 10) / 10,
      fat: Math.round(food.fat * ((food.servingWeightGrams || 100) / 100) * 10) / 10,
      caloriesPer100g: food.caloriesPer100g,
      proteinPer100g: food.protein,
      carbsPer100g: food.carbohydrates,
      fatPer100g: food.fat,
      confidence: 1.0,
      confidenceLabel: "High",
      isVerified: true,
      matchSource: "DATABASE_ITEM",
      suggestions: [],
    };

    setDetectedItems((prev) => [...prev, newItem]);
    setIsAddingFood(false);
    setFoodSearchQuery("");
    setSearchResults([]);
  };

  // Compute live meal totals
  const totalMealNutrition = detectedItems.reduce(
    (acc, item) => ({
      calories: Math.round((acc.calories + item.calories) * 10) / 10,
      protein: Math.round((acc.protein + item.protein) * 10) / 10,
      carbohydrates: Math.round((acc.carbohydrates + item.carbohydrates) * 10) / 10,
      fat: Math.round((acc.fat + item.fat) * 10) / 10,
      totalGrams: Math.round((acc.totalGrams + item.grams) * 10) / 10,
    }),
    { calories: 0, protein: 0, carbohydrates: 0, fat: 0, totalGrams: 0 }
  );

  // Confirm and persist to Food Diary
  const handleConfirmToDiary = async () => {
    if (detectedItems.length === 0) return;

    setIsSaving(true);
    setErrorBanner(null);

    const formattedItems = detectedItems.map((item) => ({
      foodItemId: item.foodItemId,
      foodVariantId: item.foodVariantId,
      name: item.displayName,
      quantity: item.quantity,
      unit: item.unit,
      grams: item.grams,
      calories: item.calories,
      protein: item.protein,
      carbohydrates: item.carbohydrates,
      fat: item.fat,
    }));

    try {
      if (isGuest) {
        // Guest user: Log directly to localStorage via addGuestLog
        formattedItems.forEach((item) => {
          addGuestLog({
            foodItemId: item.foodItemId,
            foodVariantId: item.foodVariantId,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            gramsCalculated: item.grams,
            mealType: selectedMealType,
            dateKey: dateKey,
            calories: item.calories,
            protein: item.protein,
            carbohydrates: item.carbohydrates,
            fat: item.fat,
          });
        });

        // Dispatch sync event
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("nutriflexs:nutrition-updated", {
              detail: { dateKey, mealType: selectedMealType, source: "ai-scanner" },
            })
          );
        }

        setStep("success");
        setTimeout(() => {
          onScanSuccess?.();
          onClose();
        }, 1200);
      } else {
        // Authenticated user: POST /api/nutrition/confirm-image-log
        const res = await fetch("/api/nutrition/confirm-image-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mealType: selectedMealType,
            dateKey: dateKey,
            items: formattedItems,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setErrorBanner({
            message: data.error || "Failed to save meal items to your diary.",
          });
          setIsSaving(false);
          return;
        }

        // Dispatch sync event to instantly update homepage and dashboard
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("nutriflexs:nutrition-updated", {
              detail: { dateKey, mealType: selectedMealType, source: "ai-scanner" },
            })
          );
        }

        setStep("success");
        setTimeout(() => {
          onScanSuccess?.();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      console.error("Failed to confirm meal:", err);
      setErrorBanner({
        message: "Failed to connect to server. Please try saving again.",
      });
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-nutri-charcoal/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-nutri-border flex flex-col overflow-hidden text-nutri-charcoal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scanner-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-nutri-border bg-nutri-bg/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-nutri-green-light border border-nutri-green/20 flex items-center justify-center text-nutri-green">
              <Camera className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 id="scanner-modal-title" className="font-heading font-extrabold text-lg text-nutri-charcoal flex items-center gap-2">
                <span>{step === "analysis" ? mealTitle : "Scan Your Meal"}</span>
                <Badge className="bg-nutri-green text-white text-[10px] font-bold py-0.5 px-2 rounded-full border-none">
                  AI Vision
                </Badge>
              </h2>
              <p className="text-xs text-nutri-secondary">
                {step === "analysis"
                  ? "Review and adjust portion sizes before saving to your diary"
                  : "Snap or upload a photo of your meal for instant macro breakdown"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-nutri-secondary hover:text-nutri-charcoal hover:bg-nutri-green-light rounded-2xl transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Error Banner */}
        {errorBanner && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorBanner.message}</div>
            </div>
            {errorBanner.isConfigError && (
              <div className="pt-2 border-t border-rose-200/60 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-rose-700">
                  Tip: Add <code>GEMINI_API_KEY</code> to <code>.env.local</code> to activate live Google Gemini scanning.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAnalyzeImage(true)}
                  className="text-xs font-bold bg-white text-nutri-green border-nutri-green hover:bg-nutri-green-light py-1 px-3 rounded-xl cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-nutri-green" /> Try Sample Indian Thali Scan
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: UPLOAD / CAPTURE VIEW */}
          {step === "upload" && (
            <div className="space-y-6">
              {/* Hidden file inputs */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />

              {!imagePreviewUrl ? (
                /* Initial photo selection cards */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Take Photo card */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="group p-6 rounded-3xl border-2 border-dashed border-nutri-border hover:border-nutri-green bg-nutri-bg hover:bg-nutri-green-light/40 transition-all flex flex-col items-center justify-center text-center cursor-pointer shadow-xs hover:shadow-md"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-nutri-green text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                        <Camera className="w-7 h-7 stroke-[2.2]" />
                      </div>
                      <span className="font-heading font-extrabold text-sm text-nutri-charcoal group-hover:text-nutri-green">
                        Take Photo
                      </span>
                      <span className="text-xs text-nutri-secondary mt-1">
                        Use your mobile camera to snap your plate
                      </span>
                    </button>

                    {/* Upload from Gallery card */}
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="group p-6 rounded-3xl border-2 border-dashed border-nutri-border hover:border-nutri-green bg-nutri-bg hover:bg-nutri-green-light/40 transition-all flex flex-col items-center justify-center text-center cursor-pointer shadow-xs hover:shadow-md"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-white border border-nutri-border text-nutri-green flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                        <UploadCloud className="w-7 h-7 stroke-[2.2]" />
                      </div>
                      <span className="font-heading font-extrabold text-sm text-nutri-charcoal group-hover:text-nutri-green">
                        Upload from Gallery
                      </span>
                      <span className="text-xs text-nutri-secondary mt-1">
                        Select JPEG, PNG, or WebP up to 8MB
                      </span>
                    </button>
                  </div>

                  {/* Feature highlights */}
                  <div className="p-4 rounded-2xl bg-nutri-green-soft border border-nutri-green/15 text-xs text-nutri-secondary space-y-2">
                    <div className="font-bold text-nutri-green flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Powered by NutriFlexs &amp; Gemini AI
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] list-disc list-inside">
                      <li>Recognizes Indian dishes (dal, roti, rice, sabzi, curries)</li>
                      <li>Distinguishes gravy from solid paneer, chicken &amp; veggies</li>
                      <li>Authoritative macros matched to NutriFlexs food database</li>
                      <li>Fully editable portion quantities before diary logging</li>
                    </ul>
                  </div>

                  {/* Dev / Reviewer shortcut */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => handleAnalyzeImage(true)}
                      className="text-xs font-bold text-nutri-green hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Try Sample Indian Thali Scan (Quick Demo)
                    </button>
                  </div>
                </div>
              ) : (
                /* Selected image preview */
                <div className="space-y-4">
                  <div className="relative rounded-3xl overflow-hidden border border-nutri-border bg-black max-h-[360px] flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreviewUrl}
                      alt="Meal Preview"
                      className="max-h-[360px] w-auto object-contain mx-auto"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-black/60 text-white hover:bg-black/80 text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Change Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreviewUrl(null);
                          setImageMetadata(null);
                        }}
                        className="p-1.5 rounded-xl bg-black/60 text-white hover:bg-rose-600 text-xs font-bold backdrop-blur-xs transition-colors cursor-pointer"
                        aria-label="Remove photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {imageMetadata && (
                      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium py-1 px-3 rounded-xl">
                        {imageMetadata.name} · {imageMetadata.sizeKb} KB · {imageMetadata.type}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreviewUrl(null);
                        setImageMetadata(null);
                      }}
                      className="text-xs font-bold text-nutri-secondary hover:text-nutri-charcoal cursor-pointer"
                    >
                      Cancel &amp; Retake
                    </button>

                    <Button
                      size="lg"
                      onClick={() => handleAnalyzeImage(false)}
                      className="w-full sm:w-auto bg-nutri-green hover:bg-nutri-green-dark text-white font-heading font-extrabold text-sm py-3 px-8 rounded-2xl cursor-pointer shadow-md hover:shadow-lg transition-all"
                    >
                      <Sparkles className="w-4 h-4 mr-2" /> Analyze Meal with AI
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SCANNING STATE */}
          {step === "scanning" && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative w-28 h-28 rounded-3xl bg-nutri-green-light border border-nutri-green/30 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-nutri-green/20 to-transparent animate-pulse" />
                <Loader2 className="w-12 h-12 text-nutri-green animate-spin" />
              </div>

              <div className="space-y-2 max-w-sm">
                <h3 className="font-heading font-extrabold text-base text-nutri-charcoal">
                  Analyzing Your Meal
                </h3>
                <p className="text-xs text-nutri-secondary animate-fade-in font-medium">
                  {scanMessage}
                </p>
              </div>

              <div className="w-48 bg-nutri-bg h-2 rounded-full overflow-hidden border border-nutri-border">
                <div className="h-full bg-nutri-green rounded-full animate-indeterminate" />
              </div>
            </div>
          )}

          {/* STEP 3: EDITABLE CONFIRMATION SCREEN ("Your Meal Analysis") */}
          {step === "analysis" && (
            <div className="space-y-6">
              {/* Meal Category & Thumbnail Header */}
              <div className="p-4 bg-nutri-bg rounded-2xl border border-nutri-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {imagePreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreviewUrl}
                      alt="Thumbnail"
                      className="w-12 h-12 rounded-xl object-cover border border-nutri-border shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-nutri-green-light flex items-center justify-center text-nutri-green shrink-0">
                      <Layers className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-nutri-secondary block">
                      Meal Category
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(["BREAKFAST", "LUNCH", "SNACKS", "DINNER"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSelectedMealType(type)}
                          className={`text-xs font-bold py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                            selectedMealType === type
                              ? "bg-nutri-green text-white shadow-xs"
                              : "bg-white border border-nutri-border text-nutri-charcoal hover:bg-nutri-green-light/50"
                          }`}
                        >
                          {type === "SNACKS" ? "Snacks" : type.charAt(0) + type.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-nutri-secondary block">
                    Date
                  </span>
                  <span className="text-xs font-bold text-nutri-charcoal">{dateKey}</span>
                </div>
              </div>

              {/* Detected Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-extrabold text-sm text-nutri-charcoal flex items-center gap-2">
                    <span>Detected Food Items</span>
                    <Badge className="bg-nutri-green-light text-nutri-green font-bold text-[11px] py-0.5 px-2 rounded-full border border-nutri-border-light">
                      {detectedItems.length} items
                    </Badge>
                  </span>
                  <span className="text-[11px] text-nutri-secondary">
                    Tap quantity or unit to adjust portions
                  </span>
                </div>

                {detectedItems.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-nutri-border text-xs text-nutri-secondary">
                    No items on plate. Click below to add foods manually.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detectedItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-white border border-nutri-border hover:border-nutri-green/40 shadow-xs transition-all space-y-3"
                      >
                        {/* Item top row: Name, tags & delete */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <input
                                type="text"
                                value={item.displayName}
                                onChange={(e) => handleUpdateItemName(item.id, e.target.value)}
                                className="font-heading font-bold text-sm text-nutri-charcoal bg-transparent hover:bg-nutri-bg focus:bg-white focus:ring-1 focus:ring-nutri-green border-none px-1 -mx-1 rounded-md transition-colors"
                              />

                              {item.isGravy && (
                                <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold py-0.5 px-2 rounded-full">
                                  🍛 Gravy
                                </Badge>
                              )}

                              {item.isVerified ? (
                                <Badge className="bg-nutri-green-light text-nutri-green border border-nutri-green/20 text-[10px] font-bold py-0.5 px-2 rounded-full flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-nutri-green" /> NutriFlexs Verified
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold py-0.5 px-2 rounded-full">
                                  🟡 AI Estimated
                                </Badge>
                              )}

                              <span className="text-[10px] text-nutri-secondary font-medium">
                                {Math.round(item.confidence * 100)}% match
                              </span>
                            </div>
                            <span className="text-[11px] text-nutri-secondary block">
                              {item.category} · ~{item.grams}g total
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 text-nutri-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Remove item"
                            aria-label={`Remove ${item.displayName}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Item bottom row: Quantity stepper, unit select, and live macro tags */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-nutri-border-light">
                          {/* Portion Controls */}
                          <div className="flex items-center gap-2">
                            {/* Quantity controls */}
                            <div className="flex items-center border border-nutri-border rounded-xl bg-nutri-bg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(item.id, item.quantity - 0.5)}
                                className="px-2.5 py-1 text-xs font-bold text-nutri-charcoal hover:bg-nutri-green-light hover:text-nutri-green cursor-pointer transition-colors"
                              >
                                -
                              </button>
                              <span className="px-2.5 py-1 text-xs font-extrabold text-nutri-charcoal min-w-[2rem] text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(item.id, item.quantity + 0.5)}
                                className="px-2.5 py-1 text-xs font-bold text-nutri-charcoal hover:bg-nutri-green-light hover:text-nutri-green cursor-pointer transition-colors"
                              >
                                +
                              </button>
                            </div>

                            {/* Serving Unit Dropdown */}
                            <select
                              value={item.unit}
                              onChange={(e) => handleUpdateItemUnit(item.id, e.target.value)}
                              className="text-xs font-medium bg-white border border-nutri-border rounded-xl py-1 px-2.5 text-nutri-charcoal focus:ring-1 focus:ring-nutri-green cursor-pointer"
                            >
                              {SERVING_UNIT_OPTIONS.map((u) => (
                                <option key={u.value} value={u.value}>
                                  {u.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Live Macro Tags */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-extrabold text-nutri-green">
                              {item.calories} kcal
                            </span>
                            <span className="text-nutri-border">|</span>
                            <span className="text-nutri-secondary">
                              P: <strong className="text-nutri-charcoal">{item.protein}g</strong>
                            </span>
                            <span className="text-nutri-secondary">
                              C: <strong className="text-nutri-charcoal">{item.carbohydrates}g</strong>
                            </span>
                            <span className="text-nutri-secondary">
                              F: <strong className="text-nutri-charcoal">{item.fat}g</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Missing Food Item section */}
                {!isAddingFood ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddingFood(true)}
                    className="w-full text-xs font-bold border-dashed border-nutri-border text-nutri-green hover:bg-nutri-green-light/40 py-2.5 rounded-2xl cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> + Add Missing Food Item
                  </Button>
                ) : (
                  <div className="p-4 rounded-2xl border border-nutri-green/30 bg-nutri-green-soft/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-nutri-charcoal">
                        Search NutriFlexs Food Library
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingFood(false);
                          setFoodSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="text-xs text-nutri-secondary hover:text-nutri-charcoal cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 text-nutri-secondary absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search e.g. Paneer, Roti, Dal, Rice..."
                        value={foodSearchQuery}
                        onChange={(e) => handleSearchFoods(e.target.value)}
                        className="w-full text-xs py-2 pl-9 pr-3 rounded-xl border border-nutri-border bg-white text-nutri-charcoal focus:ring-1 focus:ring-nutri-green outline-none"
                        autoFocus
                      />
                    </div>

                    {isSearchingFoods ? (
                      <div className="py-2 text-center text-xs text-nutri-secondary flex items-center justify-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-nutri-green" /> Searching...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="divide-y divide-nutri-border max-h-40 overflow-y-auto bg-white rounded-xl border border-nutri-border">
                        {searchResults.map((food) => (
                          <div
                            key={food.id}
                            onClick={() => handleAddFoodFromSearch(food)}
                            className="p-2.5 flex items-center justify-between hover:bg-nutri-green-light/40 cursor-pointer transition-colors text-xs"
                          >
                            <div>
                              <span className="font-bold text-nutri-charcoal block">{food.name}</span>
                              <span className="text-[10px] text-nutri-secondary">
                                {food.category} · {food.caloriesPer100g} kcal / 100g
                              </span>
                            </div>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-nutri-green font-bold">
                              Add +
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : foodSearchQuery.trim() ? (
                      <div className="text-center py-2 text-xs text-nutri-secondary">
                        No foods matching &ldquo;{foodSearchQuery}&rdquo;
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Total Meal Nutrition Summary Card */}
              <div className="p-5 rounded-2xl bg-nutri-green-soft border border-nutri-green/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-extrabold text-xs uppercase tracking-wider text-nutri-secondary flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-nutri-green" /> Total Meal Nutrition
                  </span>
                  <span className="text-xs font-bold text-nutri-secondary">
                    Total weight: {totalMealNutrition.totalGrams}g
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 bg-white rounded-xl border border-nutri-border-light shadow-2xs">
                    <span className="text-[10px] font-bold text-nutri-secondary block uppercase">
                      Calories
                    </span>
                    <span className="font-heading font-extrabold text-base sm:text-lg text-nutri-green block">
                      {totalMealNutrition.calories}
                    </span>
                    <span className="text-[9px] text-nutri-muted font-bold">kcal</span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-nutri-border-light shadow-2xs">
                    <span className="text-[10px] font-bold text-nutri-secondary block uppercase">
                      Protein
                    </span>
                    <span className="font-heading font-extrabold text-base sm:text-lg text-nutri-charcoal block">
                      {totalMealNutrition.protein}g
                    </span>
                    <span className="text-[9px] text-nutri-muted font-bold">repair</span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-nutri-border-light shadow-2xs">
                    <span className="text-[10px] font-bold text-nutri-secondary block uppercase">
                      Carbs
                    </span>
                    <span className="font-heading font-extrabold text-base sm:text-lg text-nutri-charcoal block">
                      {totalMealNutrition.carbohydrates}g
                    </span>
                    <span className="text-[9px] text-nutri-muted font-bold">energy</span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-nutri-border-light shadow-2xs">
                    <span className="text-[10px] font-bold text-nutri-secondary block uppercase">
                      Fat
                    </span>
                    <span className="font-heading font-extrabold text-base sm:text-lg text-nutri-charcoal block">
                      {totalMealNutrition.fat}g
                    </span>
                    <span className="text-[9px] text-nutri-muted font-bold">balance</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS VIEW */}
          {step === "success" && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-nutri-green-light border border-nutri-green/30 flex items-center justify-center text-nutri-green">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h3 className="font-heading font-extrabold text-lg text-nutri-charcoal">
                Meal Added to Food Diary!
              </h3>
              <p className="text-xs text-nutri-secondary">
                {detectedItems.length} items successfully recorded for {selectedMealType.toLowerCase()}.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions (Sticky) */}
        {step === "analysis" && (
          <div className="px-6 py-4 border-t border-nutri-border bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setStep("upload");
                setDetectedItems([]);
              }}
              className="text-xs font-bold text-nutri-secondary hover:text-nutri-charcoal cursor-pointer"
            >
              ← Back to Photo
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 sm:flex-none text-xs font-bold border-nutri-border text-nutri-charcoal cursor-pointer"
              >
                Discard
              </Button>
              <Button
                disabled={isSaving || detectedItems.length === 0}
                onClick={handleConfirmToDiary}
                className="flex-1 sm:flex-none bg-nutri-green hover:bg-nutri-green-dark text-white font-heading font-extrabold text-sm py-2.5 px-6 rounded-2xl cursor-pointer shadow-md hover:shadow-lg transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding to Diary...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1.5 stroke-[2.5]" /> Add to Food Diary ({totalMealNutrition.calories} kcal)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

