<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { supabase } from "$lib/supabase";
    import {
        getVenueById,
        updateVenue,
        updateCostCategory,
        updateLineItem,
        addLineItem,
        removeLineItem,
        addVenueDate,
        updateVenueDate,
        removeVenueDate,
        updateContract,
        addPaymentMilestone,
        updatePaymentMilestone,
        removePaymentMilestone,
        assignVendorToCategory,
        detachVendorFromCategory,
        reorderLineItems,
    } from "$lib/stores/venues.svelte";
    import {
        getVendors,
        getVendorsByCategory,
    } from "$lib/stores/vendors.svelte";
    import { getBudget } from "$lib/stores/budget.svelte";
    import {
        calculateLineItemTotal,
        calculateCategoryTotal,
        calculateVenueSubtotal,
        calculateFeesAndTaxes,
        calculateGrandTotal,
    } from "$lib/utils/calculations";
    import {
        formatCurrency,
        formatDate,
        getDayOfWeek,
        detectPricingTier,
        tierLabel,
        tierColor,
    } from "$lib/utils/formatters";
    import { genId } from "$lib/utils/defaults";
    import { showToast } from "$lib/components/ui/Toast.svelte";
    import type {
        Venue,
        CostCategory,
        LineItem,
        VenueDate,
        VenueType,
        CostCategoryType,
        PricingTier,
        DateStatus,
    } from "$lib/types";
    import { COST_CATEGORY_LABELS } from "$lib/types";
    import Card from "$lib/components/ui/Card.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import Select from "$lib/components/ui/Select.svelte";
    import Textarea from "$lib/components/ui/Textarea.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import StarRating from "$lib/components/ui/StarRating.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import {
        Info,
        CreditCard,
        Calendar,
        Gavel,
        MessageSquare,
        Star,
        Plus,
        X,
        ChevronLeft,
        ChevronRight,
        Check,
        MapPin,
        Users as UsersIcon,
        ExternalLink,
        Trash2,
        Upload,
        Image,
        FileText,
        Paperclip,
        Download,
        GripVertical,
    } from "lucide-svelte";

    // ── State ──
    let venue = $derived(getVenueById($page.params.id));
    let activeSection = $state("info");

    const sections = [
        { id: "info", label: "Basic Info", icon: Info },
        { id: "pricing", label: "Pricing & Costs", icon: CreditCard },
        { id: "dates", label: "Available Dates", icon: Calendar },
        { id: "contract", label: "Policies", icon: Gavel },
        { id: "notes", label: "Notes & Rating", icon: MessageSquare },
    ];

    // ── Budget ──
    let budget = $derived(getBudget());
    let guestCount = $derived(budget.guest_count);

    // ── Pricing derived ──
    let categories = $derived(venue?.cost_categories ?? []);
    let subtotal = $derived(calculateVenueSubtotal(categories, guestCount));
    let fees = $derived(calculateFeesAndTaxes(categories, guestCount));
    let grandTotal = $derived(calculateGrandTotal(categories, guestCount));

    // ── Calendar state ──
    let calendarYear = $state(new Date().getFullYear());
    let calendarMonth = $state(new Date().getMonth());
    let dateModalOpen = $state(false);
    let editingDate = $state<VenueDate | null>(null);
    let editingDateStr = $state("");

    function prevMonth() {
        if (calendarMonth === 0) {
            calendarMonth = 11;
            calendarYear--;
        } else calendarMonth--;
    }

    function nextMonth() {
        if (calendarMonth === 11) {
            calendarMonth = 0;
            calendarYear++;
        } else calendarMonth++;
    }

    let calendarDays = $derived.by(() => {
        const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
        const daysInMonth = new Date(
            calendarYear,
            calendarMonth + 1,
            0,
        ).getDate();
        const days: (number | null)[] = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let d = 1; d <= daysInMonth; d++) days.push(d);
        return days;
    });

    let venueDatesMap = $derived.by(() => {
        const map = new Map<string, VenueDate>();
        for (const vd of venue?.venue_dates ?? []) map.set(vd.date, vd);
        return map;
    });

    function dateStr(day: number): string {
        const m = String(calendarMonth + 1).padStart(2, "0");
        const d = String(day).padStart(2, "0");
        return `${calendarYear}-${m}-${d}`;
    }

    function dayTierColor(day: number): string {
        const ds = dateStr(day);
        const tier = detectPricingTier(ds);
        if (tier === "saturday") return "bg-tier-saturday/30";
        if (tier === "friday-sunday") return "bg-tier-frisun/30";
        return "bg-tier-weekday/30";
    }

    function openDateModal(day: number) {
        if (!venue) return;
        const ds = dateStr(day);
        editingDateStr = ds;
        const existing = venueDatesMap.get(ds);
        if (existing) {
            editingDate = { ...existing };
        } else {
            const tier = detectPricingTier(ds);
            editingDate = {
                id: genId(),
                venue_id: venue.id,
                date: ds,
                day_of_week: getDayOfWeek(ds),
                pricing_tier: tier,
                tier_price_adjustment: 0,
                status: "available" as DateStatus,
                notes: "",
            };
        }
        dateModalOpen = true;
    }

    function saveDateEntry() {
        if (!venue || !editingDate) return;
        const existing = venueDatesMap.get(editingDateStr);
        if (existing) updateVenueDate(venue.id, existing.id, editingDate);
        else addVenueDate(venue.id, editingDate);
        dateModalOpen = false;
        editingDate = null;
    }

    function deleteDateEntry() {
        if (!venue || !editingDate) return;
        const existing = venueDatesMap.get(editingDateStr);
        if (existing) removeVenueDate(venue.id, existing.id);
        dateModalOpen = false;
        editingDate = null;
    }

    // ── Helpers ──
    const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // ── Save feedback with debounced toast ──
    let lastToastTime = 0;
    function savedToast() {
        const now = Date.now();
        if (now - lastToastTime > 2000) {
            showToast("Changes saved");
            lastToastTime = now;
        }
    }

    function handleVenueBlur(field: string, value: unknown) {
        if (!venue) return;
        updateVenue(venue.id, { [field]: value });
        savedToast();
    }

    function handleCategoryToggle(
        catId: string,
        field: "included_in_venue" | "required_through_venue",
        value: boolean,
    ) {
        if (!venue) return;
        updateCostCategory(venue.id, catId, { [field]: value });
        savedToast();
    }

    function handleLineItemBlur(
        catId: string,
        itemId: string,
        field: string,
        value: unknown,
    ) {
        if (!venue) return;
        updateLineItem(venue.id, catId, itemId, { [field]: value });
        savedToast();
    }

    function handleAddLineItem(catId: string) {
        if (!venue) return;
        const cat = categories.find((c) => c.id === catId);
        const sortOrder = cat?.line_items?.length ?? 0;
        const item: LineItem = {
            id: genId(),
            category_id: catId,
            vendor_id: null,
            name: "New Item",
            cost: 0,
            quantity: 1,
            calculation_type: "flat",
            included: true,
            notes: "",
            sort_order: sortOrder,
        };
        addLineItem(venue.id, catId, item);
    }

    function handleRemoveLineItem(catId: string, itemId: string) {
        if (!venue) return;
        removeLineItem(venue.id, catId, itemId);
    }

    // ── Drag-and-drop reordering ──
    let dragCategoryId = $state<string | null>(null);
    let dragItemId = $state<string | null>(null);
    let dragOverItemId = $state<string | null>(null);

    function handleDragStart(catId: string, itemId: string) {
        dragCategoryId = catId;
        dragItemId = itemId;
    }

    function handleDragOver(e: DragEvent, catId: string, itemId: string) {
        if (dragCategoryId !== catId) return; // only within same category
        e.preventDefault();
        dragOverItemId = itemId;
    }

    function handleDrop(e: DragEvent, catId: string) {
        e.preventDefault();
        if (
            !venue ||
            dragCategoryId !== catId ||
            !dragItemId ||
            !dragOverItemId ||
            dragItemId === dragOverItemId
        ) {
            resetDrag();
            return;
        }
        const cat = categories.find((c) => c.id === catId);
        if (!cat?.line_items) {
            resetDrag();
            return;
        }

        const items = [...cat.line_items];
        const fromIdx = items.findIndex((li) => li.id === dragItemId);
        const toIdx = items.findIndex((li) => li.id === dragOverItemId);
        if (fromIdx === -1 || toIdx === -1) {
            resetDrag();
            return;
        }

        // Remove and reinsert at new position
        const [moved] = items.splice(fromIdx, 1);
        items.splice(toIdx, 0, moved);

        reorderLineItems(venue.id, catId, items);
        resetDrag();
    }

    function handleDragEnd() {
        resetDrag();
    }

    function resetDrag() {
        dragCategoryId = null;
        dragItemId = null;
        dragOverItemId = null;
    }

    function handleAssignVendor(catId: string, vendorId: string) {
        if (!venue || !vendorId) return;
        const allVendors = getVendors();
        const vendor = allVendors.find((v) => v.id === vendorId);
        if (!vendor) return;
        assignVendorToCategory(
            venue.id,
            catId,
            vendorId,
            vendor.line_items ?? [],
        );
    }

    function handleDetachVendor(catId: string) {
        if (!venue) return;
        detachVendorFromCategory(venue.id, catId);
    }

    function handleContractBlur(field: string, value: unknown) {
        if (!venue) return;
        updateContract(venue.id, { [field]: value });
        savedToast();
    }

    function handleAddMilestone() {
        if (!venue?.contract) return;
        addPaymentMilestone(venue.id, {
            id: genId(),
            contract_id: venue.contract.id,
            description: "",
            amount: 0,
            due_date: "",
            paid: false,
        });
    }

    function handleMilestoneBlur(msId: string, field: string, value: unknown) {
        if (!venue) return;
        updatePaymentMilestone(venue.id, msId, { [field]: value });
        savedToast();
    }

    function handleRemoveMilestone(msId: string) {
        if (!venue) return;
        removePaymentMilestone(venue.id, msId);
    }

    function addPro() {
        if (venue) updateVenue(venue.id, { pros: [...venue.pros, ""] });
    }
    function updatePro(idx: number, val: string) {
        if (!venue) return;
        const pros = [...venue.pros];
        pros[idx] = val;
        updateVenue(venue.id, { pros });
    }
    function removePro(idx: number) {
        if (!venue) return;
        updateVenue(venue.id, { pros: venue.pros.filter((_, i) => i !== idx) });
    }

    function addCon() {
        if (venue) updateVenue(venue.id, { cons: [...venue.cons, ""] });
    }
    function updateCon(idx: number, val: string) {
        if (!venue) return;
        const cons = [...venue.cons];
        cons[idx] = val;
        updateVenue(venue.id, { cons });
    }
    function removeCon(idx: number) {
        if (!venue) return;
        updateVenue(venue.id, { cons: venue.cons.filter((_, i) => i !== idx) });
    }

    let externalLinks = $state<string[]>([]);
    $effect(() => {
        if (venue) externalLinks = [];
    });
    function addLink() {
        externalLinks = [...externalLinks, ""];
    }
    function updateLink(idx: number, val: string) {
        externalLinks[idx] = val;
    }
    function removeLink(idx: number) {
        externalLinks = externalLinks.filter((_, i) => i !== idx);
    }

    function getVendorName(vendorId: string | null): string {
        if (!vendorId) return "";
        const allVendors = getVendors();
        return (
            allVendors.find((v) => v.id === vendorId)?.name ?? "Unknown Vendor"
        );
    }

    function statusDot(status: DateStatus): string {
        switch (status) {
            case "available":
                return "bg-secondary";
            case "held":
                return "bg-tertiary-container";
            case "booked":
                return "bg-primary";
            default:
                return "bg-on-surface/30";
        }
    }

    function scrollToSection(id: string) {
        activeSection = id;
    }

    // ── Image upload (Supabase Storage) ──
    let imageInputEl = $state<HTMLInputElement | null>(null);
    let imageUploading = $state(false);

    async function handleImageUpload(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        if (!file || !venue) return;
        imageUploading = true;
        try {
            const ext = file.name.split(".").pop() || "jpg";
            const path = `venues/${venue.id}/photo.${ext}`;
            // Remove old file if exists
            await supabase.storage.from("images").remove([path]);
            const { error } = await supabase.storage
                .from("images")
                .upload(path, file, { upsert: true });
            if (error) {
                console.error("Image upload error:", error);
                showToast("Failed to upload image", "error");
                return;
            }
            const { data: urlData } = supabase.storage
                .from("images")
                .getPublicUrl(path);
            // Append timestamp to bust cache
            const publicUrl = urlData.publicUrl + "?t=" + Date.now();
            handleVenueBlur("image_url", publicUrl);
        } catch (err) {
            console.error("Image upload error:", err);
            showToast("Failed to upload image", "error");
        } finally {
            imageUploading = false;
            input.value = "";
        }
    }

    async function removeImage() {
        if (!venue) return;
        if (venue.image_url) {
            try {
                // Extract path from URL
                const url = new URL(venue.image_url.split("?")[0]);
                const pathMatch = url.pathname.match(
                    /\/object\/public\/images\/(.+)/,
                );
                if (pathMatch) {
                    await supabase.storage
                        .from("images")
                        .remove([pathMatch[1]]);
                }
            } catch {
                // Ignore cleanup errors
            }
        }
        handleVenueBlur("image_url", "");
    }

    // ── Attachment upload (Supabase Storage) ──
    let attachmentInputEl = $state<HTMLInputElement | null>(null);
    let attachmentUploading = $state(false);

    async function handleAttachmentUpload(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        if (!file || !venue) return;
        attachmentUploading = true;
        try {
            const attachmentId = genId();
            const ext = file.name.split(".").pop() || "pdf";
            const path = `venues/${venue.id}/attachments/${attachmentId}.${ext}`;
            const { error } = await supabase.storage
                .from("images")
                .upload(path, file);
            if (error) {
                console.error("Attachment upload error:", error);
                showToast("Failed to upload attachment", "error");
                return;
            }
            const { data: urlData } = supabase.storage
                .from("images")
                .getPublicUrl(path);
            const newAttachment = {
                id: attachmentId,
                name: file.name,
                data: urlData.publicUrl,
                type: file.type,
            };
            const existing = venue!.attachments ?? [];
            updateVenue(venue!.id, {
                attachments: [...existing, newAttachment],
            });
            savedToast();
        } catch (err) {
            console.error("Attachment upload error:", err);
            showToast("Failed to upload attachment", "error");
        } finally {
            attachmentUploading = false;
            input.value = "";
        }
    }

    async function removeAttachment(attachmentId: string) {
        if (!venue) return;
        const existing = venue.attachments ?? [];
        const attachment = existing.find((a) => a.id === attachmentId);
        if (attachment?.data) {
            try {
                const url = new URL(attachment.data);
                const pathMatch = url.pathname.match(
                    /\/object\/public\/images\/(.+)/,
                );
                if (pathMatch) {
                    await supabase.storage
                        .from("images")
                        .remove([pathMatch[1]]);
                }
            } catch {
                // Ignore cleanup errors
            }
        }
        updateVenue(venue.id, {
            attachments: existing.filter((a) => a.id !== attachmentId),
        });
        savedToast();
    }

    function previewAttachment(attachment: {
        name: string;
        data: string;
        type: string;
    }) {
        // data now contains a public URL, so just open it
        window.open(attachment.data, "_blank");
    }
</script>

{#if !venue}
    <div class="max-w-4xl mx-auto p-8">
        <div
            class="bg-surface-lowest rounded-xl p-8 text-center border border-outline-variant"
        >
            <h2 class="text-xl font-semibold text-on-surface mb-4">
                Venue not found
            </h2>
            <p class="text-on-surface-variant mb-6">
                The venue you're looking for doesn't exist or has been removed.
            </p>
            <Button onclick={() => goto("/venues")}>Back to Venues</Button>
        </div>
    </div>
{:else}
    <div class="max-w-7xl mx-auto px-4 pt-12 lg:pt-6 py-6 pb-28">
        <!-- Header -->
        <div class="flex items-center gap-4 mb-6">
            <button
                onclick={() => goto("/venues")}
                class="p-2 rounded-xl hover:bg-surface-high text-on-surface-variant transition cursor-pointer"
            >
                <ChevronLeft size={20} />
            </button>
            <div class="flex-1">
                <h1 class="text-4xl font-bold tracking-tight text-on-surface">
                    {venue.name || "Untitled Venue"}
                </h1>
                {#if venue.location}
                    <div
                        class="flex items-center gap-1.5 mt-1 text-on-surface-variant"
                    >
                        <MapPin size={14} />
                        <span class="text-sm">{venue.location}</span>
                    </div>
                {/if}
            </div>
            <span
                class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-primary-fixed text-on-primary-container"
            >
                {venue.venue_type === "all-inclusive"
                    ? "All-Inclusive"
                    : venue.venue_type === "semi-inclusive"
                      ? "Semi-Inclusive"
                      : "Open Vendor"}
            </span>
        </div>

        <div class="flex gap-6">
            <!-- Sticky Sidebar (desktop) -->
            <aside class="hidden lg:block w-64 shrink-0">
                <div class="sticky top-20 space-y-1">
                    <span
                        class="font-mono text-[10px] uppercase tracking-widest text-secondary px-3 mb-2 block"
                        >Navigation</span
                    >
                    {#each sections as sec}
                        <button
                            onclick={() => scrollToSection(sec.id)}
                            class="w-full text-left px-3 py-2.5 rounded-lg text-sm transition cursor-pointer flex items-center gap-3
								{activeSection === sec.id
                                ? 'bg-surface-low text-primary font-medium'
                                : 'text-on-surface-variant hover:bg-surface-high'}"
                        >
                            <sec.icon size={16} />
                            {sec.label}
                        </button>
                    {/each}

                    <!-- Sidebar summary card -->
                    <div
                        class="mt-8 pt-6 border-t border-outline-variant space-y-4 px-3"
                    >
                        <div
                            class="bg-surface-lowest rounded-xl p-4 border border-outline-variant"
                        >
                            <span
                                class="font-mono text-[10px] uppercase tracking-widest text-secondary block mb-2"
                                >Grand Total</span
                            >
                            <div
                                class="text-2xl font-bold text-primary font-mono tabular-nums"
                            >
                                {formatCurrency(grandTotal)}
                            </div>
                        </div>
                        <button
                            class="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-on-primary bg-gradient-to-r from-primary to-primary-container hover:opacity-90 transition cursor-pointer"
                        >
                            Book Venue
                        </button>
                        <!-- Attachments section -->
                        <div class="space-y-2">
                            {#if venue.attachments && venue.attachments.length > 0}
                                {#each venue.attachments as attachment (attachment.id)}
                                    <div
                                        class="flex items-center gap-2 p-2 rounded-lg bg-surface-low border border-outline-variant"
                                    >
                                        <FileText
                                            size={14}
                                            class="text-primary flex-shrink-0"
                                        />
                                        <button
                                            onclick={() =>
                                                previewAttachment(attachment)}
                                            class="flex-1 text-left text-xs text-on-surface truncate hover:text-primary transition cursor-pointer"
                                            title={attachment.name}
                                        >
                                            {attachment.name}
                                        </button>
                                        <button
                                            onclick={() =>
                                                previewAttachment(attachment)}
                                            class="p-1 rounded-lg hover:bg-surface-high text-on-surface-variant hover:text-primary transition cursor-pointer"
                                            title="Preview"
                                        >
                                            <ExternalLink size={12} />
                                        </button>
                                        <button
                                            onclick={() =>
                                                removeAttachment(attachment.id)}
                                            class="p-1 rounded-lg hover:bg-error-container text-on-surface-variant/40 hover:text-error transition cursor-pointer"
                                            title="Remove"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                {/each}
                            {/if}
                            <button
                                onclick={() => attachmentInputEl?.click()}
                                disabled={attachmentUploading}
                                class="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-primary border border-primary hover:bg-surface-low transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {#if attachmentUploading}
                                    <div
                                        class="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
                                    ></div>
                                    Uploading...
                                {:else}
                                    <Paperclip size={14} />
                                    Upload Attachment
                                {/if}
                            </button>
                            <input
                                bind:this={attachmentInputEl}
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                                class="hidden"
                                onchange={handleAttachmentUpload}
                            />
                        </div>
                    </div>
                </div>
            </aside>

            <!-- Mobile section pill bar -->
            <div
                class="lg:hidden fixed top-14 left-0 right-0 z-40 bg-background/95 backdrop-blur border-b border-outline-variant"
            >
                <div class="flex gap-1 px-4 py-2 overflow-x-auto no-scrollbar">
                    {#each sections as sec}
                        <button
                            onclick={() => scrollToSection(sec.id)}
                            class="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5
								{activeSection === sec.id
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-high text-on-surface-variant hover:bg-surface-highest'}"
                        >
                            <sec.icon size={12} />
                            {sec.label}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Main content -->
            <div class="flex-1 min-w-0 lg:mt-0 mt-2">
                <!-- ═══ BASIC INFO ═══ -->
                {#if activeSection === "info"}
                    <div class="space-y-6">
                        <!-- Venue image upload -->
                        <div
                            class="aspect-video rounded-xl overflow-hidden relative group"
                        >
                            {#if venue.image_url}
                                <img
                                    src={venue.image_url}
                                    alt={venue.name || "Venue photo"}
                                    class="w-full h-full object-cover"
                                />
                                <div
                                    class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100"
                                >
                                    <button
                                        onclick={() => imageInputEl?.click()}
                                        class="p-3 rounded-xl bg-surface-lowest/90 text-on-surface hover:bg-surface-lowest transition cursor-pointer"
                                        title="Change photo"
                                    >
                                        <Upload size={20} />
                                    </button>
                                    <button
                                        onclick={removeImage}
                                        class="p-3 rounded-xl bg-surface-lowest/90 text-error hover:bg-error-container transition cursor-pointer"
                                        title="Remove photo"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            {:else}
                                <button
                                    onclick={() => imageInputEl?.click()}
                                    disabled={imageUploading}
                                    class="w-full h-full bg-surface-low border-2 border-dashed border-outline-variant/40 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/40 hover:bg-surface transition-colors rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div
                                        class="w-14 h-14 rounded-full bg-surface flex items-center justify-center"
                                    >
                                        {#if imageUploading}
                                            <div
                                                class="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
                                            ></div>
                                        {:else}
                                            <Upload
                                                size={24}
                                                class="text-on-surface-variant/50"
                                            />
                                        {/if}
                                    </div>
                                    <div class="text-center">
                                        <span
                                            class="text-on-surface-variant text-sm font-medium block"
                                            >{imageUploading
                                                ? "Uploading..."
                                                : "Upload venue photo"}</span
                                        >
                                        <span
                                            class="text-on-surface-variant/40 text-xs"
                                            >JPG, PNG up to 10MB</span
                                        >
                                    </div>
                                </button>
                            {/if}
                            <input
                                bind:this={imageInputEl}
                                type="file"
                                accept="image/*"
                                class="hidden"
                                onchange={handleImageUpload}
                            />
                        </div>

                        <!-- Venue name / location edit -->
                        <div
                            class="bg-surface-lowest rounded-xl p-6 border border-outline-variant"
                        >
                            <span
                                class="font-mono text-[10px] uppercase tracking-widest text-secondary block mb-4"
                                >Venue Details</span
                            >
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Venue Name"
                                    value={venue.name}
                                    onblur={(e) =>
                                        handleVenueBlur(
                                            "name",
                                            e.currentTarget.value,
                                        )}
                                />
                                <Input
                                    label="Location"
                                    value={venue.location}
                                    onblur={(e) =>
                                        handleVenueBlur(
                                            "location",
                                            e.currentTarget.value,
                                        )}
                                />
                                <div class="md:col-span-2">
                                    <Textarea
                                        label="Contact Info"
                                        value={venue.contact_info}
                                        rows={2}
                                        onblur={(e) =>
                                            handleVenueBlur(
                                                "contact_info",
                                                e.currentTarget.value,
                                            )}
                                    />
                                </div>
                            </div>
                        </div>

                        <!-- Description -->
                        <div class="bg-surface-low rounded-xl p-6">
                            <span
                                class="font-mono text-[10px] uppercase tracking-widest text-secondary block mb-3"
                                >Description</span
                            >
                            <Textarea
                                value={venue.description}
                                rows={4}
                                placeholder="Describe this venue..."
                                onblur={(e) =>
                                    handleVenueBlur(
                                        "description",
                                        e.currentTarget.value,
                                    )}
                            />
                        </div>

                        <!-- Capacity cards -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                class="bg-surface-lowest rounded-xl p-6 border border-outline-variant"
                            >
                                <div class="flex items-center gap-2 mb-3">
                                    <UsersIcon size={16} class="text-primary" />
                                    <span
                                        class="font-mono text-[10px] uppercase tracking-widest text-secondary"
                                        >Seated Capacity</span
                                    >
                                </div>
                                <Input
                                    type="number"
                                    value={venue.capacity_seated}
                                    onblur={(e) =>
                                        handleVenueBlur(
                                            "capacity_seated",
                                            Number(e.currentTarget.value),
                                        )}
                                />
                            </div>
                            <div
                                class="bg-surface-lowest rounded-xl p-6 border border-outline-variant"
                            >
                                <div class="flex items-center gap-2 mb-3">
                                    <UsersIcon size={16} class="text-primary" />
                                    <span
                                        class="font-mono text-[10px] uppercase tracking-widest text-secondary"
                                        >Standing Capacity</span
                                    >
                                </div>
                                <Input
                                    type="number"
                                    value={venue.capacity_standing}
                                    onblur={(e) =>
                                        handleVenueBlur(
                                            "capacity_standing",
                                            Number(e.currentTarget.value),
                                        )}
                                />
                            </div>
                        </div>

                        <!-- Venue Type + Indoor/Outdoor/Weather badges -->
                        <div
                            class="bg-surface-lowest rounded-xl p-6 border border-outline-variant"
                        >
                            <span
                                class="font-mono text-[10px] uppercase tracking-widest text-secondary block mb-4"
                                >Type & Setting</span
                            >
                            <div
                                class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"
                            >
                                <Select
                                    label="Venue Type"
                                    value={venue.venue_type}
                                    onchange={(e) =>
                                        handleVenueBlur(
                                            "venue_type",
                                            e.currentTarget.value,
                                        )}
                                >
                                    <option value="all-inclusive"
                                        >All-Inclusive</option
                                    >
                                    <option value="semi-inclusive"
                                        >Semi-Inclusive</option
                                    >
                                    <option value="open-vendor"
                                        >Open Vendor</option
                                    >
                                </Select>
                            </div>
                            <div class="flex flex-wrap gap-3">
                                <label
                                    class="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-high cursor-pointer transition hover:bg-surface-highest"
                                >
                                    <input
                                        type="checkbox"
                                        checked={venue.indoor}
                                        onchange={(e) =>
                                            handleVenueBlur(
                                                "indoor",
                                                e.currentTarget.checked,
                                            )}
                                        class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/50 cursor-pointer"
                                    />
                                    <span class="text-sm text-on-surface"
                                        >Indoor</span
                                    >
                                </label>
                                <label
                                    class="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-high cursor-pointer transition hover:bg-surface-highest"
                                >
                                    <input
                                        type="checkbox"
                                        checked={venue.outdoor}
                                        onchange={(e) =>
                                            handleVenueBlur(
                                                "outdoor",
                                                e.currentTarget.checked,
                                            )}
                                        class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/50 cursor-pointer"
                                    />
                                    <span class="text-sm text-on-surface"
                                        >Outdoor</span
                                    >
                                </label>
                            </div>
                        </div>

                        <!-- Parking & Accessibility -->
                        <div
                            class="bg-surface-lowest rounded-xl p-6 border border-outline-variant"
                        >
                            <span
                                class="font-mono text-[10px] uppercase tracking-widest text-secondary block mb-4"
                                >Additional Details</span
                            >
                            <div class="space-y-4">
                                <Textarea
                                    label="Weather Backup"
                                    value={venue.weather_backup}
                                    onblur={(e) =>
                                        handleVenueBlur(
                                            "weather_backup",
                                            e.currentTarget.value,
                                        )}
                                />
                                <Textarea
                                    label="Parking Info"
                                    value={venue.parking_info}
                                    onblur={(e) =>
                                        handleVenueBlur(
                                            "parking_info",
                                            e.currentTarget.value,
                                        )}
                                />
                                <Textarea
                                    label="Accessibility Notes"
                                    value={venue.accessibility_notes}
                                    onblur={(e) =>
                                        handleVenueBlur(
                                            "accessibility_notes",
                                            e.currentTarget.value,
                                        )}
                                />
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- ═══ PRICING (Spreadsheet Grid) ═══ -->
                {#if activeSection === "pricing"}
                    {@const optionalTotal = categories.reduce((sum, cat) => {
                        if (!cat.line_items) return sum;
                        return (
                            sum +
                            cat.line_items
                                .filter(
                                    (li) =>
                                        !li.included &&
                                        li.calculation_type !== "percentage",
                                )
                                .reduce((s, li) => {
                                    if (li.calculation_type === "per-person")
                                        return (
                                            s +
                                            li.cost * guestCount * li.quantity
                                        );
                                    return s + li.cost * li.quantity;
                                }, 0)
                        );
                    }, 0)}
                    <div class="space-y-4">
                        <div
                            class="bg-surface-lowest rounded-xl border border-outline-variant overflow-hidden"
                        >
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm">
                                    <thead>
                                        <tr class="bg-surface-low">
                                            <th
                                                class="py-2.5 px-3 text-left font-mono text-[10px] uppercase tracking-widest text-secondary"
                                                >Item</th
                                            >
                                            <th
                                                class="py-2.5 px-2 text-left font-mono text-[10px] uppercase tracking-widest text-secondary w-24"
                                                >Cost ($)</th
                                            >
                                            <th
                                                class="py-2.5 px-2 text-left font-mono text-[10px] uppercase tracking-widest text-secondary w-16"
                                                >Qty</th
                                            >
                                            <th
                                                class="py-2.5 px-2 text-left font-mono text-[10px] uppercase tracking-widest text-secondary w-28"
                                                >Type</th
                                            >
                                            <th
                                                class="py-2.5 px-2 text-center font-mono text-[10px] uppercase tracking-widest text-secondary w-24"
                                                >Status</th
                                            >
                                            <th
                                                class="py-2.5 px-2 text-left font-mono text-[10px] uppercase tracking-widest text-secondary w-28"
                                                >Notes</th
                                            >
                                            <th
                                                class="py-2.5 px-2 text-right font-mono text-[10px] uppercase tracking-widest text-secondary w-20"
                                                >Total</th
                                            >
                                            <th class="py-2.5 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each categories as category (category.id)}
                                            {@const catTotal =
                                                calculateCategoryTotal(
                                                    category,
                                                    guestCount,
                                                )}
                                            {@const matchingVendors =
                                                getVendorsByCategory(
                                                    category.type,
                                                )}

                                            <!-- Category header row -->
                                            <tr
                                                class="bg-surface border-t-2 border-outline-variant"
                                            >
                                                <td
                                                    class="py-3 px-3"
                                                    colspan="5"
                                                >
                                                    <div
                                                        class="flex items-center gap-3"
                                                    >
                                                        <span
                                                            class="font-bold text-primary uppercase text-xs tracking-wide"
                                                            >{category.name}</span
                                                        >
                                                        {#if category.vendor_id}
                                                            <span
                                                                class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary-container text-on-secondary-container"
                                                                >{getVendorName(
                                                                    category.vendor_id,
                                                                )}</span
                                                            >
                                                            <button
                                                                onclick={() =>
                                                                    handleDetachVendor(
                                                                        category.id,
                                                                    )}
                                                                class="text-[10px] text-error hover:underline cursor-pointer ml-1"
                                                                >Remove</button
                                                            >
                                                        {:else if matchingVendors.length > 0 && venue.venue_type !== "all-inclusive"}
                                                            <select
                                                                class="text-xs rounded-lg border border-outline-variant bg-surface-lowest px-1.5 py-1 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                                                                onchange={(
                                                                    e,
                                                                ) => {
                                                                    handleAssignVendor(
                                                                        category.id,
                                                                        e
                                                                            .currentTarget
                                                                            .value,
                                                                    );
                                                                    e.currentTarget.value =
                                                                        "";
                                                                }}
                                                                value=""
                                                            >
                                                                <option value=""
                                                                    >Assign
                                                                    vendor...</option
                                                                >
                                                                {#each matchingVendors as v}<option
                                                                        value={v.id}
                                                                        >{v.name}</option
                                                                    >{/each}
                                                            </select>
                                                        {/if}
                                                    </div>
                                                </td>
                                                <td class="py-3 px-2"></td>
                                                <td
                                                    class="py-3 px-2 text-right font-bold text-on-surface font-mono tabular-nums"
                                                    >{formatCurrency(
                                                        catTotal,
                                                    )}</td
                                                >
                                                <td class="py-3 px-1">
                                                    <button
                                                        onclick={() =>
                                                            handleAddLineItem(
                                                                category.id,
                                                            )}
                                                        class="p-1 rounded-lg hover:bg-surface-high text-on-surface-variant hover:text-primary transition cursor-pointer"
                                                        title="Add item"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </td>
                                            </tr>

                                            <!-- Line items -->
                                            {#each category.line_items ?? [] as item (item.id)}
                                                {@const itemTotal =
                                                    calculateLineItemTotal(
                                                        item,
                                                        guestCount,
                                                        subtotal,
                                                    )}
                                                {@const isDragOver =
                                                    dragOverItemId ===
                                                        item.id &&
                                                    dragCategoryId ===
                                                        category.id &&
                                                    dragItemId !== item.id}
                                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                                <tr
                                                    class="border-b border-outline-variant/50 hover:bg-surface-low/50 group/row {!item.included
                                                        ? 'opacity-60'
                                                        : ''} {isDragOver
                                                        ? 'border-t-2 border-t-primary'
                                                        : ''}"
                                                    draggable="true"
                                                    ondragstart={() =>
                                                        handleDragStart(
                                                            category.id,
                                                            item.id,
                                                        )}
                                                    ondragover={(e) =>
                                                        handleDragOver(
                                                            e,
                                                            category.id,
                                                            item.id,
                                                        )}
                                                    ondrop={(e) =>
                                                        handleDrop(
                                                            e,
                                                            category.id,
                                                        )}
                                                    ondragend={handleDragEnd}
                                                >
                                                    <td class="py-1.5 px-1">
                                                        <div
                                                            class="flex items-center gap-1.5"
                                                        >
                                                            <span
                                                                class="cursor-grab active:cursor-grabbing text-on-surface-variant/30 hover:text-on-surface-variant/60 transition shrink-0"
                                                            >
                                                                <GripVertical
                                                                    size={14}
                                                                />
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={item.name}
                                                                class="w-full bg-transparent text-sm text-on-surface border-0 border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none px-0 py-0.5 transition"
                                                                onblur={(e) =>
                                                                    handleLineItemBlur(
                                                                        category.id,
                                                                        item.id,
                                                                        "name",
                                                                        e
                                                                            .currentTarget
                                                                            .value,
                                                                    )}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td class="py-1.5 px-2">
                                                        <input
                                                            type="number"
                                                            value={item.cost}
                                                            step="0.01"
                                                            min="0"
                                                            class="w-full bg-transparent text-sm text-on-surface font-mono border-0 border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none px-0 py-0.5 transition tabular-nums"
                                                            onblur={(e) =>
                                                                handleLineItemBlur(
                                                                    category.id,
                                                                    item.id,
                                                                    "cost",
                                                                    Number(
                                                                        e
                                                                            .currentTarget
                                                                            .value,
                                                                    ),
                                                                )}
                                                        />
                                                    </td>
                                                    <td class="py-1.5 px-2">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            min="0"
                                                            class="w-full bg-transparent text-sm text-on-surface font-mono border-0 border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none px-0 py-0.5 transition tabular-nums"
                                                            onblur={(e) =>
                                                                handleLineItemBlur(
                                                                    category.id,
                                                                    item.id,
                                                                    "quantity",
                                                                    Number(
                                                                        e
                                                                            .currentTarget
                                                                            .value,
                                                                    ),
                                                                )}
                                                        />
                                                    </td>
                                                    <td class="py-1.5 px-2">
                                                        <div class="relative">
                                                            <span
                                                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-surface-highest text-on-surface-variant pointer-events-none"
                                                            >
                                                                {#if item.calculation_type === "flat"}FLAT{:else if item.calculation_type === "per-person"}P/P{:else}%{/if}
                                                            </span>
                                                            <select
                                                                value={item.calculation_type}
                                                                class="absolute inset-0 opacity-0 w-full cursor-pointer"
                                                                onchange={(e) =>
                                                                    handleLineItemBlur(
                                                                        category.id,
                                                                        item.id,
                                                                        "calculation_type",
                                                                        e
                                                                            .currentTarget
                                                                            .value,
                                                                    )}
                                                            >
                                                                <option
                                                                    value="flat"
                                                                    >Flat</option
                                                                >
                                                                <option
                                                                    value="per-person"
                                                                    >Per Person</option
                                                                >
                                                                <option
                                                                    value="percentage"
                                                                    >Percentage</option
                                                                >
                                                            </select>
                                                        </div>
                                                    </td>
                                                    <td
                                                        class="py-1.5 px-2 text-center"
                                                    >
                                                        <Tooltip
                                                            text={item.included
                                                                ? "Required. This cost is included in the total. Click to mark as optional."
                                                                : "Optional. This cost is NOT included in the total. Click to mark as required."}
                                                            side="top"
                                                        >
                                                            <button
                                                                onclick={() =>
                                                                    handleLineItemBlur(
                                                                        category.id,
                                                                        item.id,
                                                                        "included",
                                                                        !item.included,
                                                                    )}
                                                                class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide cursor-pointer transition-colors
																{item.included
                                                                    ? 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/70'
                                                                    : 'bg-surface-highest text-on-surface-variant/60 hover:bg-surface-high'}"
                                                            >
                                                                {item.included
                                                                    ? "Required"
                                                                    : "Optional"}
                                                            </button>
                                                        </Tooltip>
                                                    </td>
                                                    <td class="py-1.5 px-2">
                                                        <input
                                                            type="text"
                                                            value={item.notes}
                                                            placeholder="..."
                                                            class="w-full bg-transparent text-xs text-on-surface-variant border-0 border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none px-0 py-0.5 transition"
                                                            onblur={(e) =>
                                                                handleLineItemBlur(
                                                                    category.id,
                                                                    item.id,
                                                                    "notes",
                                                                    e
                                                                        .currentTarget
                                                                        .value,
                                                                )}
                                                        />
                                                    </td>
                                                    <td
                                                        class="py-1.5 px-2 text-right font-mono tabular-nums text-on-surface/80"
                                                    >
                                                        {#if item.included}
                                                            {formatCurrency(
                                                                itemTotal,
                                                            )}
                                                        {:else}
                                                            <span
                                                                class="text-on-surface-variant/50"
                                                                >{formatCurrency(
                                                                    item.calculation_type ===
                                                                        "per-person"
                                                                        ? item.cost *
                                                                              guestCount *
                                                                              item.quantity
                                                                        : item.cost *
                                                                              item.quantity,
                                                                )}</span
                                                            >
                                                        {/if}
                                                    </td>
                                                    <td class="py-1.5 px-1">
                                                        <button
                                                            onclick={() =>
                                                                handleRemoveLineItem(
                                                                    category.id,
                                                                    item.id,
                                                                )}
                                                            class="p-1 rounded-lg hover:bg-error-container text-on-surface-variant/40 hover:text-error transition cursor-pointer"
                                                            title="Remove item"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            {/each}
                                        {/each}
                                    </tbody>
                                </table>
                            </div>

                            <!-- Grand total bar -->
                            <div
                                class="bg-surface-high border-t-2 border-outline-variant px-4 py-3 space-y-2"
                            >
                                <div
                                    class="flex items-center justify-between gap-4 flex-wrap"
                                >
                                    <div
                                        class="flex items-center gap-6 text-sm text-on-surface-variant"
                                    >
                                        <Tooltip
                                            text="Total of all items marked as required — these costs are included in the grand total."
                                            side="bottom"
                                            ><span
                                                >Required: <strong
                                                    class="text-on-surface font-mono tabular-nums"
                                                    >{formatCurrency(
                                                        subtotal,
                                                    )}</strong
                                                ></span
                                            ></Tooltip
                                        >
                                        {#if optionalTotal > 0}
                                            <Tooltip
                                                text="Total of all items marked as optional — these costs are NOT included in the grand total."
                                                side="bottom"
                                                ><span
                                                    >Optional: <strong
                                                        class="font-mono tabular-nums text-on-surface-variant"
                                                        >{formatCurrency(
                                                            optionalTotal,
                                                        )}</strong
                                                    ></span
                                                ></Tooltip
                                            >
                                        {/if}
                                        {#if fees.serviceCharge > 0}<span
                                                >Service: <strong
                                                    class="font-mono tabular-nums"
                                                    >{formatCurrency(
                                                        fees.serviceCharge,
                                                    )}</strong
                                                ></span
                                            >{/if}
                                        {#if fees.gratuity > 0}<span
                                                >Gratuity: <strong
                                                    class="font-mono tabular-nums"
                                                    >{formatCurrency(
                                                        fees.gratuity,
                                                    )}</strong
                                                ></span
                                            >{/if}
                                        {#if fees.tax > 0}<span
                                                >Tax: <strong
                                                    class="font-mono tabular-nums"
                                                    >{formatCurrency(
                                                        fees.tax,
                                                    )}</strong
                                                ></span
                                            >{/if}
                                        {#if fees.otherFees > 0}<span
                                                >Other: <strong
                                                    class="font-mono tabular-nums"
                                                    >{formatCurrency(
                                                        fees.otherFees,
                                                    )}</strong
                                                ></span
                                            >{/if}
                                    </div>
                                    <div
                                        class="text-lg font-bold text-primary font-mono tabular-nums"
                                    >
                                        {formatCurrency(grandTotal)}
                                    </div>
                                </div>
                                {#if optionalTotal > 0}
                                    <div
                                        class="text-xs text-on-surface-variant"
                                    >
                                        With optional add-ons: <span
                                            class="font-mono"
                                            >{formatCurrency(
                                                grandTotal + optionalTotal,
                                            )}</span
                                        >
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- ═══ DATES ═══ -->
                {#if activeSection === "dates"}
                    <div class="space-y-4">
                        <div
                            class="bg-surface-lowest rounded-xl p-6 border border-outline-variant"
                        >
                            <div class="flex items-center justify-between mb-6">
                                <button
                                    onclick={prevMonth}
                                    class="p-2 rounded-lg hover:bg-surface-high text-on-surface-variant transition cursor-pointer"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <h3
                                    class="text-lg font-semibold text-on-surface"
                                >
                                    {monthNames[calendarMonth]}
                                    {calendarYear}
                                </h3>
                                <button
                                    onclick={nextMonth}
                                    class="p-2 rounded-lg hover:bg-surface-high text-on-surface-variant transition cursor-pointer"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                            <div class="grid grid-cols-7 gap-1">
                                {#each dayHeaders as dh}
                                    <div
                                        class="text-center text-xs font-mono uppercase tracking-widest text-secondary py-2"
                                    >
                                        {dh}
                                    </div>
                                {/each}
                                {#each calendarDays as day}
                                    {#if day === null}
                                        <div></div>
                                    {:else}
                                        {@const ds = dateStr(day)}
                                        {@const existingDate =
                                            venueDatesMap.get(ds)}
                                        <button
                                            onclick={() => openDateModal(day)}
                                            class="relative aspect-square rounded-lg p-1 text-sm transition cursor-pointer hover:ring-2 hover:ring-primary/50 {dayTierColor(
                                                day,
                                            )}"
                                        >
                                            <span class="font-medium"
                                                >{day}</span
                                            >
                                            {#if existingDate}
                                                <div
                                                    class="absolute bottom-1 left-1/2 -translate-x-1/2"
                                                >
                                                    <span
                                                        class="w-2 h-2 rounded-full inline-block {statusDot(
                                                            existingDate.status,
                                                        )}"
                                                    ></span>
                                                </div>
                                            {/if}
                                        </button>
                                    {/if}
                                {/each}
                            </div>
                            <div
                                class="flex flex-wrap gap-4 mt-6 pt-4 border-t border-outline-variant"
                            >
                                <div
                                    class="flex items-center gap-2 text-xs text-on-surface-variant"
                                >
                                    <span
                                        class="w-4 h-4 rounded bg-tier-saturday/30"
                                    ></span>Saturday
                                </div>
                                <div
                                    class="flex items-center gap-2 text-xs text-on-surface-variant"
                                >
                                    <span
                                        class="w-4 h-4 rounded bg-tier-frisun/30"
                                    ></span>Fri / Sun
                                </div>
                                <div
                                    class="flex items-center gap-2 text-xs text-on-surface-variant"
                                >
                                    <span
                                        class="w-4 h-4 rounded bg-tier-weekday/30"
                                    ></span>Weekday
                                </div>
                                <div class="w-px bg-outline-variant"></div>
                                <div
                                    class="flex items-center gap-2 text-xs text-on-surface-variant"
                                >
                                    <span
                                        class="w-2.5 h-2.5 rounded-full bg-secondary"
                                    ></span>Available
                                </div>
                                <div
                                    class="flex items-center gap-2 text-xs text-on-surface-variant"
                                >
                                    <span
                                        class="w-2.5 h-2.5 rounded-full bg-tertiary-container"
                                    ></span>Held
                                </div>
                                <div
                                    class="flex items-center gap-2 text-xs text-on-surface-variant"
                                >
                                    <span
                                        class="w-2.5 h-2.5 rounded-full bg-primary"
                                    ></span>Booked
                                </div>
                            </div>
                        </div>

                        <Modal
                            open={dateModalOpen}
                            onclose={() => {
                                dateModalOpen = false;
                                editingDate = null;
                            }}
                            title="Date Details"
                        >
                            {#if editingDate}
                                <div class="space-y-4">
                                    <div>
                                        <p
                                            class="text-sm font-medium text-on-surface mb-1"
                                        >
                                            {formatDate(editingDate.date)} ({editingDate.day_of_week})
                                        </p>
                                        <Badge
                                            variant={editingDate.pricing_tier ===
                                            "saturday"
                                                ? "saturday"
                                                : editingDate.pricing_tier ===
                                                    "friday-sunday"
                                                  ? "frisun"
                                                  : "weekday"}
                                        >
                                            {tierLabel(
                                                editingDate.pricing_tier,
                                            )}
                                        </Badge>
                                    </div>
                                    <Select
                                        label="Status"
                                        value={editingDate.status}
                                        onchange={(e) => {
                                            if (editingDate)
                                                editingDate.status = e
                                                    .currentTarget
                                                    .value as DateStatus;
                                        }}
                                    >
                                        <option value="available"
                                            >Available</option
                                        >
                                        <option value="held">Held</option>
                                        <option value="booked">Booked</option>
                                    </Select>
                                    <Select
                                        label="Pricing Tier"
                                        value={editingDate.pricing_tier}
                                        onchange={(e) => {
                                            if (editingDate)
                                                editingDate.pricing_tier = e
                                                    .currentTarget
                                                    .value as PricingTier;
                                        }}
                                    >
                                        <option value="saturday"
                                            >Saturday (Premium)</option
                                        >
                                        <option value="friday-sunday"
                                            >Friday / Sunday</option
                                        >
                                        <option value="weekday">Weekday</option>
                                    </Select>
                                    <Input
                                        label="Tier Price Adjustment ($)"
                                        type="number"
                                        step="0.01"
                                        value={editingDate.tier_price_adjustment}
                                        onchange={(e) => {
                                            if (editingDate)
                                                editingDate.tier_price_adjustment =
                                                    Number(
                                                        e.currentTarget.value,
                                                    );
                                        }}
                                    />
                                    <Textarea
                                        label="Notes"
                                        value={editingDate.notes}
                                        onchange={(e) => {
                                            if (editingDate)
                                                editingDate.notes =
                                                    e.currentTarget.value;
                                        }}
                                    />
                                    <div
                                        class="flex gap-3 justify-between pt-2"
                                    >
                                        {#if venueDatesMap.has(editingDateStr)}
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onclick={deleteDateEntry}
                                                >Remove Date</Button
                                            >
                                        {:else}<div></div>{/if}
                                        <div class="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onclick={() => {
                                                    dateModalOpen = false;
                                                    editingDate = null;
                                                }}>Cancel</Button
                                            >
                                            <Button
                                                size="sm"
                                                onclick={saveDateEntry}
                                                >Save</Button
                                            >
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </Modal>
                    </div>
                {/if}

                <!-- ═══ CONTRACT & POLICIES ═══ -->
                {#if activeSection === "contract"}
                    <div class="space-y-6">
                        {#if venue.contract}
                            <!-- Deposit -->
                            <div
                                class="bg-surface-highest/20 rounded-xl p-6 border border-outline-variant"
                            >
                                <span
                                    class="font-mono text-[10px] uppercase tracking-widest text-secondary block mb-4"
                                    >Deposit</span
                                >
                                <div
                                    class="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    <Input
                                        label="Deposit Amount ($)"
                                        type="number"
                                        step="0.01"
                                        value={venue.contract.deposit_amount}
                                        onblur={(e) =>
                                            handleContractBlur(
                                                "deposit_amount",
                                                Number(e.currentTarget.value),
                                            )}
                                    />
                                    <Input
                                        label="Deposit Due Date"
                                        type="date"
                                        value={venue.contract.deposit_due_date}
                                        onblur={(e) =>
                                            handleContractBlur(
                                                "deposit_due_date",
                                                e.currentTarget.value,
                                            )}
                                    />
                                </div>
                            </div>

                            <!-- Payment Milestones -->
                            <div
                                class="bg-surface-highest/20 rounded-xl p-6 border border-outline-variant"
                            >
                                <div
                                    class="flex items-center justify-between mb-4"
                                >
                                    <span
                                        class="font-mono text-[10px] uppercase tracking-widest text-secondary"
                                        >Payment Schedule</span
                                    >
                                    <button
                                        onclick={handleAddMilestone}
                                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-surface-low transition cursor-pointer"
                                    >
                                        <Plus size={14} />
                                        Add Milestone
                                    </button>
                                </div>
                                {#if venue.contract.payment_milestones && venue.contract.payment_milestones.length > 0}
                                    <div class="space-y-3">
                                        {#each venue.contract.payment_milestones as ms (ms.id)}
                                            <div
                                                class="flex items-start gap-3 p-4 rounded-xl border {ms.paid
                                                    ? 'bg-secondary-container/10 border-secondary'
                                                    : 'bg-surface-lowest border-outline-variant'}"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={ms.paid}
                                                    onchange={(e) =>
                                                        handleMilestoneBlur(
                                                            ms.id,
                                                            "paid",
                                                            e.currentTarget
                                                                .checked,
                                                        )}
                                                    class="w-4 h-4 mt-2 rounded border-outline-variant text-secondary focus:ring-secondary/50 cursor-pointer"
                                                />
                                                <div
                                                    class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3"
                                                >
                                                    <Input
                                                        label="Description"
                                                        value={ms.description}
                                                        onblur={(e) =>
                                                            handleMilestoneBlur(
                                                                ms.id,
                                                                "description",
                                                                e.currentTarget
                                                                    .value,
                                                            )}
                                                    />
                                                    <div>
                                                        <Input
                                                            label="Amount ($)"
                                                            type="number"
                                                            step="0.01"
                                                            value={ms.amount}
                                                            onblur={(e) =>
                                                                handleMilestoneBlur(
                                                                    ms.id,
                                                                    "amount",
                                                                    Number(
                                                                        e
                                                                            .currentTarget
                                                                            .value,
                                                                    ),
                                                                )}
                                                        />
                                                        <span
                                                            class="text-xs font-mono text-on-surface-variant mt-1 block"
                                                            >{formatCurrency(
                                                                ms.amount,
                                                            )}</span
                                                        >
                                                    </div>
                                                    <Input
                                                        label="Due Date"
                                                        type="date"
                                                        value={ms.due_date}
                                                        onblur={(e) =>
                                                            handleMilestoneBlur(
                                                                ms.id,
                                                                "due_date",
                                                                e.currentTarget
                                                                    .value,
                                                            )}
                                                    />
                                                </div>
                                                <div
                                                    class="flex items-center gap-2 mt-6"
                                                >
                                                    <span
                                                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium {ms.paid
                                                            ? 'bg-secondary text-on-secondary'
                                                            : 'bg-primary text-on-primary'}"
                                                    >
                                                        {ms.paid
                                                            ? "Paid"
                                                            : "Pending"}
                                                    </span>
                                                    <button
                                                        onclick={() =>
                                                            handleRemoveMilestone(
                                                                ms.id,
                                                            )}
                                                        class="p-1.5 rounded-lg hover:bg-error-container text-on-surface-variant/40 hover:text-error transition cursor-pointer"
                                                        title="Remove milestone"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                {:else}
                                    <p
                                        class="text-sm text-on-surface-variant italic"
                                    >
                                        No payment milestones added yet.
                                    </p>
                                {/if}
                            </div>

                            <!-- Policies & Restrictions -->
                            <div
                                class="bg-surface-highest/20 rounded-xl p-6 border border-outline-variant"
                            >
                                <span
                                    class="font-mono text-[10px] uppercase tracking-widest text-secondary block mb-4"
                                    >Policies & Restrictions</span
                                >
                                <div class="space-y-4">
                                    <Textarea
                                        label="Cancellation Policy"
                                        value={venue.contract
                                            .cancellation_policy}
                                        onblur={(e) =>
                                            handleContractBlur(
                                                "cancellation_policy",
                                                e.currentTarget.value,
                                            )}
                                    />
                                    <Textarea
                                        label="Force Majeure"
                                        value={venue.contract.force_majeure}
                                        onblur={(e) =>
                                            handleContractBlur(
                                                "force_majeure",
                                                e.currentTarget.value,
                                            )}
                                    />
                                    <Textarea
                                        label="Vendor Restrictions"
                                        value={venue.contract
                                            .vendor_restrictions}
                                        onblur={(e) =>
                                            handleContractBlur(
                                                "vendor_restrictions",
                                                e.currentTarget.value,
                                            )}
                                    />
                                    <Textarea
                                        label="Noise Restrictions"
                                        value={venue.contract
                                            .noise_restrictions}
                                        onblur={(e) =>
                                            handleContractBlur(
                                                "noise_restrictions",
                                                e.currentTarget.value,
                                            )}
                                    />
                                    <Textarea
                                        label="Time Restrictions"
                                        value={venue.contract.time_restrictions}
                                        onblur={(e) =>
                                            handleContractBlur(
                                                "time_restrictions",
                                                e.currentTarget.value,
                                            )}
                                    />
                                    <Textarea
                                        label="Decor Restrictions"
                                        value={venue.contract
                                            .decor_restrictions}
                                        onblur={(e) =>
                                            handleContractBlur(
                                                "decor_restrictions",
                                                e.currentTarget.value,
                                            )}
                                    />
                                    <Textarea
                                        label="Additional Notes"
                                        value={venue.contract.additional_notes}
                                        onblur={(e) =>
                                            handleContractBlur(
                                                "additional_notes",
                                                e.currentTarget.value,
                                            )}
                                    />
                                </div>
                            </div>
                        {:else}
                            <div
                                class="bg-surface-lowest rounded-xl p-8 text-center border border-outline-variant"
                            >
                                <p class="text-on-surface-variant">
                                    No contract information available for this
                                    venue.
                                </p>
                            </div>
                        {/if}
                    </div>
                {/if}

                <!-- ═══ NOTES & RATING ═══ -->
                {#if activeSection === "notes"}
                    <div class="space-y-6">
                        <!-- Overall Score card -->
                        <div
                            class="bg-surface-lowest rounded-xl p-8 border border-outline-variant text-center"
                        >
                            <span
                                class="font-mono text-[10px] uppercase tracking-widest text-secondary block mb-4"
                                >Overall Score</span
                            >
                            <div class="flex justify-center mb-3">
                                <StarRating
                                    value={venue.rating}
                                    size="lg"
                                    onchange={(val) =>
                                        handleVenueBlur("rating", val)}
                                />
                            </div>
                            {#if venue.rating > 0}
                                <div class="text-4xl font-bold text-primary">
                                    {venue.rating}<span
                                        class="text-lg text-on-surface-variant font-normal"
                                        >/5</span
                                    >
                                </div>
                            {/if}
                        </div>

                        <!-- Pros & Cons side by side -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Pros -->
                            <div
                                class="bg-secondary-container/10 rounded-xl p-6 border border-secondary-container/30"
                            >
                                <div
                                    class="flex items-center justify-between mb-4"
                                >
                                    <span
                                        class="font-mono text-[10px] uppercase tracking-widest text-secondary"
                                        >Pros</span
                                    >
                                    <button
                                        onclick={addPro}
                                        class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-secondary hover:bg-secondary-container/20 transition cursor-pointer"
                                    >
                                        <Plus size={12} />
                                        Add
                                    </button>
                                </div>
                                {#if venue.pros.length > 0}
                                    <div class="space-y-2">
                                        {#each venue.pros as pro, i}
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <Check
                                                    size={14}
                                                    class="text-secondary flex-shrink-0"
                                                />
                                                <input
                                                    type="text"
                                                    value={pro}
                                                    class="flex-1 bg-transparent text-sm text-on-surface border-0 border-b border-transparent hover:border-secondary-container focus:border-secondary focus:outline-none px-0 py-1 transition"
                                                    onblur={(e) =>
                                                        updatePro(
                                                            i,
                                                            e.currentTarget
                                                                .value,
                                                        )}
                                                />
                                                <button
                                                    onclick={() => removePro(i)}
                                                    class="p-1 rounded-lg hover:bg-error-container text-on-surface-variant/30 hover:text-error transition cursor-pointer"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        {/each}
                                    </div>
                                {:else}<p
                                        class="text-sm text-on-surface-variant italic"
                                    >
                                        No pros added yet.
                                    </p>{/if}
                            </div>

                            <!-- Cons -->
                            <div
                                class="bg-error-container/10 rounded-xl p-6 border border-error-container/30"
                            >
                                <div
                                    class="flex items-center justify-between mb-4"
                                >
                                    <span
                                        class="font-mono text-[10px] uppercase tracking-widest text-secondary"
                                        >Cons</span
                                    >
                                    <button
                                        onclick={addCon}
                                        class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-error hover:bg-error-container/20 transition cursor-pointer"
                                    >
                                        <Plus size={12} />
                                        Add
                                    </button>
                                </div>
                                {#if venue.cons.length > 0}
                                    <div class="space-y-2">
                                        {#each venue.cons as con, i}
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <X
                                                    size={14}
                                                    class="text-error flex-shrink-0"
                                                />
                                                <input
                                                    type="text"
                                                    value={con}
                                                    class="flex-1 bg-transparent text-sm text-on-surface border-0 border-b border-transparent hover:border-error-container focus:border-error focus:outline-none px-0 py-1 transition"
                                                    onblur={(e) =>
                                                        updateCon(
                                                            i,
                                                            e.currentTarget
                                                                .value,
                                                        )}
                                                />
                                                <button
                                                    onclick={() => removeCon(i)}
                                                    class="p-1 rounded-lg hover:bg-error-container text-on-surface-variant/30 hover:text-error transition cursor-pointer"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        {/each}
                                    </div>
                                {:else}<p
                                        class="text-sm text-on-surface-variant italic"
                                    >
                                        No cons added yet.
                                    </p>{/if}
                            </div>
                        </div>

                        <!-- Planner's Notes -->
                        <div class="bg-surface-low rounded-xl p-6">
                            <span
                                class="font-mono text-[10px] uppercase tracking-widest text-secondary block mb-3"
                                >Planner's Notes</span
                            >
                            <Textarea
                                value={venue.notes}
                                rows={6}
                                placeholder="Add your notes about this venue..."
                                onblur={(e) =>
                                    handleVenueBlur(
                                        "notes",
                                        e.currentTarget.value,
                                    )}
                            />
                        </div>

                        <!-- External Links -->
                        <div
                            class="bg-surface-lowest rounded-xl p-6 border border-outline-variant"
                        >
                            <div class="flex items-center justify-between mb-4">
                                <span
                                    class="font-mono text-[10px] uppercase tracking-widest text-secondary"
                                    >External Links</span
                                >
                                <button
                                    onclick={addLink}
                                    class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-primary hover:bg-surface-low transition cursor-pointer"
                                >
                                    <Plus size={12} />
                                    Add Link
                                </button>
                            </div>
                            {#if externalLinks.length > 0}
                                <div class="space-y-2">
                                    {#each externalLinks as link, i}
                                        <div class="flex items-center gap-2">
                                            <ExternalLink
                                                size={14}
                                                class="text-on-surface-variant/40 flex-shrink-0"
                                            />
                                            <input
                                                type="url"
                                                value={link}
                                                placeholder="https://..."
                                                class="flex-1 bg-transparent text-sm text-on-surface border-0 border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none px-0 py-1 transition"
                                                onblur={(e) =>
                                                    updateLink(
                                                        i,
                                                        e.currentTarget.value,
                                                    )}
                                            />
                                            {#if link}
                                                <a
                                                    href={link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    class="p-1 rounded-lg hover:bg-surface-high text-on-surface-variant/40 hover:text-primary transition"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                            {/if}
                                            <button
                                                onclick={() => removeLink(i)}
                                                class="p-1 rounded-lg hover:bg-error-container text-on-surface-variant/30 hover:text-error transition cursor-pointer"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    {/each}
                                </div>
                            {:else}<p
                                    class="text-sm text-on-surface-variant italic"
                                >
                                    No external links added yet.
                                </p>{/if}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
