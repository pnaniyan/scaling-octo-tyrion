var Store = {
    initialize: function () {},
    getStore: function (e) {
        return {
            name: this.appName + "." + e
        };
    },
    set: function (e, t, n) {
        if (!this.isSet(e)) {
            var r = this.getStore(e);
            var i = {
                data: t,
                time: Math.floor(Date.now() / 1e3),
                period: n
            };
            window.localStorage[r.name] = JSON.stringify(i);
        }
    },
    get: function (e) {
        if (this.isSet(e)) {
            var t = this.getStore(e);
            var n = JSON.parse(window.localStorage[t.name]);
            return n.data;
        }
        return false;
    },
    clear: function (e) {
        var t = this.getStore(e);
        localStorage.removeItem(t.name);
    },
    clearAll: function () {
        var e = this.appName.length;
        var t = this.appName;
        Object.keys(localStorage).forEach(function (n) {
            if (n.substring(0, e) === t) localStorage.removeItem(n);
        });
    },
    isSet: function (e) {
        var t = this.getStore(e);
        var n = Math.floor(Date.now() / 1e3);
        if (window.localStorage[t.name] === undefined) {
            return false;
        }
        var r = JSON.parse(window.localStorage[t.name]);
        if (n - parseInt(r.time) > parseInt(r.period) && parseInt(r.period) !== 0) {
            this.clear(e);
            return false;
        }
        return true;
    }
};
Store.appName = "MedicineBOX";
var Common = {
    showLoading: function (e) {
        if (typeof e !== "undefined") {
            $.mobile.loadingMessage = e;
        }
        $.mobile.loadingMessageTheme = "c";
        $.mobile.showPageLoadingMsg();
    },
    hideLoading: function () {
        $.mobile.hidePageLoadingMsg();
    },
    callAjax: function (e, t, n, r) {
        this.showLoading(n);
        var i = {
            type: "POST",
            url: Application.Config.ajUrl + "index.php?key=" + Application.Config.key + "&action=" + e,
            dataType: "json",
            success: function (e) {
                Common.hideLoading();
                if (e.status !== "success") {
                    Application.showMessage(e.message, "Error");
                } else {
                    t(e);
                }
            },
            error: function () {
                Common.hideLoading();
                Application.showMessage("Error in network", "Error");
            }
        };
        if (typeof r !== "undefined") {
            i.data = r;
        }
        $.ajax(i);
    }
};
var Patients = {
    bindEvents: function () {
        $("#patientSearch").off("keyup");
        $("#patientList").off("tap", "a");
        $("#patientSearch").on("keyup", Patients.loadData);
        $("#patientList").on("tap", "a", Patients.getDetail);
    },
    loadData: function (e) {
        var t = true;
        if (typeof e !== "undefined") {
            if ($("#patientSearch").val().trim().length < 2) {
                t = false;
            }
        }
        if (t) {
            var n = "getPatients";
            if ($("#patientSearch").val().trim() !== "") {
                n += "&search=" + $("#patientSearch").val();
            }
            Common.callAjax(n, function (e) {
                Patients.populateData(e.patients);
            }, "Patients");
        }
    },
    populateData: function (e) {
        Common.showLoading("Populating");
        $("#patientList").children(".detail").remove();
        var t;
        var n;
        $.each(e, function (e, r) {
            t = $(".template", $("#patientList")).clone().removeClass("template");
            t.addClass("detail");
            t.find(".title").text(r.patientName + " (" + r.hospitalNo + ")");
            t.find(".roomnumber").text(r.room);
            t.find(".doctor").text(r.doctorName);
            n = r.isCredit ? "Credit" : "Cash";
            t.find(".actype").text(n);
            t.find(".patientId").val(r.patientId);
            t.addClass("patient-" + e);
            $("#patientList").append(t);
        });
        Common.hideLoading();
    },
    getDetail: function () {
        var e = $(this).find(".patientId").val();
        Common.callAjax("getPatientDetail", function (e) {
            PatientDetail.initPatinet(e.patientDetail);
            $.mobile.changePage("#patientDetail", {
                transition: "slide",
                reverse: false,
                changeHash: true
            });
        }, "Patient Datail", {
            patientId: e
        });
    }
};
var PatientDetail = {
    init: function () {
        Application.hideMessage();
        if ($("#patDoctor option").length === 0) {
            this.populateDoctors(this.populateData);
        } else {
            this.populateData();
        }
        $("#patAcType").slider('disable');
    },
    populateData: function () {
        var e = PatientDetail.patient.isCredit ? "off" : "on";
        $("#patientDetailId").val(PatientDetail.patient.patientId);
        $("#patName").val(PatientDetail.patient.patientName);
        $("#patHospitalNo").val(PatientDetail.patient.hospitalNo);
        $("#patRoom").val(PatientDetail.patient.room);
        $("#patAcType").val(e);
        $("#patDoctor").val(PatientDetail.patient.doctorId);
        $("#patDoctor").selectmenu("refresh");
        $("#patAcType").slider("refresh");
    },
    bindEvents: function () {
        $("#btnPatDetNext").off("tap");
        $("#btnPatDetBack").off("tap");
        $("#btnPatDetNext").on("tap", PatientDetail.nextPage);
        $("#btnPatDetBack").on("tap", PatientDetail.prevPage);
    },
    initPatinet: function (e) {
        this.patient = e;
    },
    populateDoctors: function (e) {
        Common.callAjax("getDoctors", function (t) {
            $("#patDoctor").children().remove();
            $.each(t.doctors, function (n, r) {
                var i = $("<option>");
                i.text(r.doctorName);
                i.attr("value", r.doctorId);
                $("#patDoctor").append(i);
                if (n === t.doctors.length - 1) {
                    e();
                }
            });
        }, "Doctors");
    },
    nextPage: function () {
        PatientDetail.patient.doctorId = $("#patDoctor").val();
        PatientDetail.patient.doctorName = $("#patDoctor option:selected").text();
        if ($("#patAcType").val() === "on") {
            PatientDetail.patient.isCredit = false;
        } else {
            PatientDetail.patient.isCredit = true;
        }
        PatientDetail.patient.room = $("#patRoom").val();
        Requirement.required.patient = PatientDetail.patient;
        $.mobile.changePage("#requirements", {
            transition: "slide",
            reverse: false,
            changeHash: true
        });
    },
    prevPage: function () {
        $.mobile.back();
    }
};
var Requirement = {
    bindEvents: function () {
        $("#btnReqBack").off("tap");
        $("#btnAddMedicines").off("tap");
        $("#btnReqNext").off("tap");
        $("#medicineList").off("tap", "a.editItem");
        $("#medicineList").off("tap", "a.delItem");
        $("#btnReqBack").on("tap", Requirement.prevPage);
        $("#btnAddMedicines").on("tap", Requirement.addMedicines);
        $("#btnReqNext").on("tap", Requirement.nextPage);
        $("#medicineList").on("tap", "a.editItem", Medicines.editItem);
        $("#medicineList").on("tap", "a.delItem", Medicines.deleteItem);
    },
    init: function () {
        Application.hideMessage();
        this.populatePatient();
        this.populateMedicines();
    },
    populatePatient: function () {
        var e = Requirement.required.patient;
        var t = e.isCredit ? "Credit" : "Cash";
        $("#patDet .name").text(e.patientName + " (" + e.hospitalNo + ")");
        $("#patDet .room").text(e.room);
        $("#patDet .doctor").text(e.doctorName);
        $("#patDet .actype").text(t);
    },
    populateMedicines: function () {
        $("#medicineList .detail").remove();
        $.each(Requirement.required.medicines, function (e, t) {
            var n = $(".template", $("#medicineList")).clone().removeClass("template");
            n.addClass("detail");
            n.find(".medName").text(t.itemName);
            n.find(".qty").text(t.quantity);
            n.find(".itemId").val(t.itemId);
            n.find(".index").val(e);
            $("#medicineList").append(n);
        });
    },
    addMedicines: function () {
        $.mobile.changePage("#addMedicines", {
            transition: "slide",
            reverse: false,
            changeHash: true
        });
    },
    nextPage: function () {
        if (Requirement.required.medicines.length === 0) {
            Application.showMessage("Please add medicines.");
            setTimeout("Application.hideMessage()", "3000");
        } else {
            $.mobile.changePage("#summary", {
                transition: "slide",
                reverse: false,
                changeHash: true
            });
        }
    },
    prevPage: function () {
        $.mobile.back();
    }
};
Requirement.required = {
    medicines: []
};
Medicines = {
    bindEvents: function () {
        $("#medSearch").off("keyup");
        $("#itemList").off("tap", "a");
        $("#btnAddItem").off("tap");
        $("#btnFinishItem").off("tap");
        $("#btnMedicinesBack").off("tap");
        $("#addedItems").off("tap", "a.editItem");
        $("#btnCancelItem").off("tap");
        $("#btnSaveItem").off("tap");
        $("#addedItems").off("tap", "a.delItem");
        $("#medSearch").on("keyup", Medicines.loadData);
        $("#itemList").on("tap", "a", Medicines.medicineSelected);
        $("#btnAddItem").on("tap", Medicines.addItem);
        $("#btnFinishItem").on("tap", Medicines.finish);
        $("#btnMedicinesBack").on("tap", Medicines.prevPage);
        $("#searchMedContiner").on("tap", ".ui-input-clear", Medicines.clearSearch);
        $("#addedItems").on("tap", "a.editItem", Medicines.editItem);
        $("#addedItems").on("tap", "a.delItem", Medicines.deleteItem);
        $("#btnCancelItem").on("tap", Medicines.cancelEdit);
        $("#btnSaveItem").on("tap", Medicines.saveItem);
    },
    init: function () {
        Application.hideMessage();
        Medicines.refreshAddedItems();
        if (typeof Medicines.currentIndex !== "undefined" && typeof Medicines.currentItem !== "undefined") {
            Medicines.editView();
        }
    },
    loadData: function (e) {
        var t = true;
        if (typeof e !== "undefined") {
            if ($("#medSearch").val().trim().length < 2) {
                t = false;
            }
        }
        if (t) {
            var n = "getMedicines";
            if ($("#medSearch").val().trim() !== "") {
                n += "&search=" + $("#medSearch").val();
            }
            Common.callAjax(n, function (e) {
                $("#itemList").removeClass("template");
                Medicines.populateData(e.medicines);
            }, "Medicines");
        }
    },
    populateData: function (e) {
        Common.showLoading("Populating");
        $("#itemList").children(".medicine").remove();
        $("#medicineId").val("");
        var t;
        $.each(e, function (e, n) {
            t = $(".template", $("#itemList")).clone().removeClass("template");
            t.addClass("medicine");
            t.addClass("medicine-" + e);
            t.find(".itemName").text(n.itemName);
            t.find(".itemId").val(n.itemId);
            $("#itemList").append(t);
        });
        Common.hideLoading();
    },
    refreshAddedItems: function () {
        $("#addedItems .detail").remove();
        $.each(Requirement.required.medicines, function (e, t) {
            var n = {
                itemId: t.itemId,
                itemName: t.itemName,
                quantity: t.quantity,
                index: e
            };
            Medicines.addMedicine(n);
        });
    },
    refreshSingle: function (e) {
        var t = $(".row-" + e, $("#addedItems"));
        t.find(".qty").text(Requirement.required.medicines[e].quantity);
    },
    addMedicine: function (e) {
        var t = $(".template", $("#addedItems")).clone().removeClass("template");
        t.addClass("detail");
        t.addClass("row-" + e.index);
        t.find(".medName").text(e.itemName);
        t.find(".qty").text(e.quantity);
        t.find(".itemId").val(e.itemId);
        t.find(".index").val(e.index);
        $("#addedItems").append(t);
    },
    medicineSelected: function (e) {
        $("#medSearch").val($(e.currentTarget).text());
        $("#medicineId").val($(e.currentTarget).parent().find(".itemId").val());
        $("#medSearch").next().addClass("ui-input-clear-hidden");
        $("#itemList").addClass("template");
    },
    editItem: function (e) {
        if (!$(e.currentTarget).hasClass("disabled")) {
            if (typeof Medicines.currentIndex !== "undefined") {
                Medicines.cancelEdit();
            }
            Medicines.currentIndex = $(e.currentTarget).parents(".detail").find(".index").val();
            Medicines.currentItem = Requirement.required.medicines[Medicines.currentIndex];
            if ($.mobile.activePage.attr("id") === "requirements") {
                $.mobile.changePage("#addMedicines", {
                    transition: "slide",
                    reverse: false,
                    changeHash: true
                });
            } else {
                Medicines.editView();
            }
        }
    },
    editView: function () {
        $("#medicineId").val(Medicines.currentItem.itemId);
        $("#medSearch").val(Medicines.currentItem.itemName);
        $("#quantity").val(Medicines.currentItem.quantity);
        $("#addedItems .row-" + Medicines.currentIndex + " a").addClass("disabled");
        $("#medSearch").attr("disabled", "disabled");
        $("#addBlock").addClass("template");
        $("#editBlock").removeClass("template");
    },
    cancelEdit: function () {
        $("#addedItems .row-" + Medicines.currentIndex + " a").removeClass("disabled");
        Medicines.currentIndex = undefined;
        Medicines.currentItem = undefined;
        $("#medicineId").val("");
        $("#medSearch").val("");
        $("#quantity").val("");
        $("#medSearch").removeAttr("disabled");
        $("#addBlock").removeClass("template");
        $("#editBlock").addClass("template");
    },
    saveItem: function () {
        if ($("#quantity").val().trim() !== "") {
            Medicines.currentItem.quantity = $("#quantity").val();
            Requirement.required.medicines[Medicines.currentIndex] = Medicines.currentItem;
            Medicines.refreshSingle(Medicines.currentIndex);
            Medicines.cancelEdit();
        } else {
            Application.showMessage("Please enter a valid quantity", "Error");
        }
    },
    deleteItem: function (e) {
        if (!$(e.currentTarget).hasClass("disabled")) {
            var t = $(e.currentTarget).parent().find(".index").val();
            Requirement.required.medicines.splice(t, 1);
            if ($.mobile.activePage.attr("id") === "requirements") {
                Requirement.populateMedicines();
            } else {
                Medicines.refreshAddedItems();
            }
        }
    },
    clearSearch: function () {
        $("#medSearch").val("");
    },
    addItem: function () {
        var e = "";
        var t = true;
        var n = {
            itemId: $("#medicineId").val(),
            itemName: $("#medSearch").val(),
            quantity: $("#quantity").val()
        };
        if ($.trim(n.itemId) === "") {
            t = false;
            e += "Please select an Item.<br />";
        }
        if ($.trim(n.quantity) === "") {
            t = false;
            e += "Please enter a valid quantity.<br />";
        }
        if (t) {
            Medicines.inMedicines(n.itemId, function () {
                Application.showMessage("Item already added.", "Error");
            }, function () {
                var e = {
                    itemId: n.itemId,
                    itemName: n.itemName,
                    quantity: n.quantity,
                    index: Requirement.required.medicines.length
                };
                Requirement.required.medicines.push(n);
                Application.hideMessage();
                Medicines.addMedicine(e);
                $("#medicineId").val("");
                $("#medSearch").val("");
                $("#quantity").val("");
            });
        } else {
            Application.showMessage(e, "Error");
        }
        return false;
    },
    finish: function () {
        $.mobile.back();
    },
    prevPage: function () {
        $.mobile.back();
    },
    inMedicines: function (e, t, n) {
        if (Requirement.required.medicines.length === 0) {
            n();
            return;
        }
        $.each(Requirement.required.medicines, function (r, i) {
            if (i.itemId === e) {
                t();
                return;
            }
            if (r === Requirement.required.medicines.length - 1) {
                n();
            }
        });
    }
};
var Summary = {
    bindEvents: function () {
        $("#btnSumBack").off("tap");
        $("#btnSubmitReq").off("tap");
        $("#btnAddNew").off("tap");
        $("#btnSumBack").on("tap", Summary.prevPage);
        $("#btnSubmitReq").on("tap", Summary.submitRequirement);
        $("#btnAddNew").on("tap", Application.addNew);
    },
    init: function () {
        Application.hideMessage();
        $(".rqcode").hide();
        $(".rqcode span").text("");
        $("#btnSumBack").button("enable");
        $("#btnSubmitReq").button("enable");
        $("#submitBlock").removeClass("template");
        $("#newBlock").addClass("template");
        Summary.populatePatient();
        Summary.populateMedicines();
    },
    populatePatient: function () {
        var e = Requirement.required.patient;
        var t = e.isCredit ? "Credit" : "Cash";
        $("#sumPatient .name").text(e.patientName + " - (" + e.hospitalNo + ")");
        $("#sumPatient .room").text(e.room);
        $("#sumPatient .doctor").text(e.doctorName);
        $("#sumPatient .actype").text(t);
    },
    populateMedicines: function () {
        $("#sumMedicines .detail").remove();
        $.each(Requirement.required.medicines, function (e, t) {
            var n = $(".template", $("#sumMedicines")).clone().removeClass("template");
            n.addClass("detail");
            n.find(".itemName").text(t.itemName);
            n.find(".qty").text(t.quantity);
            $("#sumMedicines").append(n);
        });
    },
    submitRequirement: function () {
        $("#btnSubmitReq").button("disable");
        $("#btnSumBack").button("disable");
        var e = "sumitRequirement";
        Requirement.required.patient.userName = Store.get("user").username;
        Common.callAjax(e, function (e) {
            Summary.reqSubmited(e);
        }, "Medicines", Requirement.required);
    },
    reqSubmited: function (e) {
        Application.showMessage("Medicine requirement submited successfully.", "Success", true);
        $(".rqcode span").text(e.Requirement.ReqCode);
        $(".rqcode").slideDown(500);
        $("#submitBlock").addClass("template");
        $("#newBlock").removeClass("template");
    },
    prevPage: function () {
        $.mobile.back();
    }
};
var Application = {
    isAuthenticate: function () {
        return Store.isSet("user");
    },
    login: function () {
        var e = {
            username: $("#username").val(),
            password: $("#password").val()
        };
        if (e.username === "" || e.password === "") {
            Application.showMessage("Please fill the details completely.", "Error");
            return false;
        }
        Common.callAjax("login", Application.loginSuccess, "Login", e);
        return false;
    },
    loginSuccess: function (e) {
        Application.Config.LoggedInUser = e.user;
        Store.set("user", Application.Config.LoggedInUser);
        $.mobile.changePage("#searchPatient", {
            transition: "slide",
            reverse: false,
            changeHash: false
        });
    },
    showMessage: function (e, t, n) {
        if (typeof n === "undefined") {
            n = false;
        }
        if (typeof t === "undefined") {
            t = "Error";
        }
        if (!n) {
            if (typeof navigator.notification !== "undefined") {
                navigator.notification.alert(e, function () {}, t);
            } else {
                var r;
                if (t === "Error") {
                    r = '<span class="ui-icon ui-icon-alert msg-icon"> </span>';
                    $.mobile.activePage.find(".error-message").addClass("error");
                } else if (t === "Success") {
                    r = '<span class="ui-icon ui-icon-check msg-icon"> </span>';
                    $.mobile.activePage.find(".error-message").addClass("success");
                }
                $.mobile.activePage.find(".error-message").html(r + e).slideDown(500);
            }
        } else {
            var r;
            if (t === "Error") {
                r = '<span class="ui-icon ui-icon-alert msg-icon"> </span>';
                $.mobile.activePage.find(".error-message").addClass("error");
            } else if (t === "Success") {
                r = '<span class="ui-icon ui-icon-check msg-icon"> </span>';
                $.mobile.activePage.find(".error-message").addClass("success");
            }
            $.mobile.activePage.find(".error-message").html(r + e).slideDown(500);
        }
    },
    hideMessage: function () {
        $.mobile.activePage.find(".error-message").removeClass("error").removeClass("success");
        $.mobile.activePage.find(".error-message").slideUp(500);
    },
    cancelRequirement: function () {
        Application.addNew();
    },
    addNew: function () {
        PatientDetail.patient = undefined;
        Requirement.required = {
            medicines: []
        };
        $.mobile.changePage("#searchPatient", {
            transition: "slide",
            reverse: false,
            changeHash: true
        });
    },
    bindCommonEvents: function () {
        $(".navNew").off("tap");
        $(".navCancel").off("tap");
        $(".navLogout").off("tap");
        $(".navNew").on("tap", Application.addNew);
        $(".navCancel").on("tap", Application.addNew);
        $(".navLogout").on("tap", Application.logout);
    },
    logout: function () {
        PatientDetail.patient = undefined;
        Requirement.required = {
            medicines: []
        };
        Store.clear("user");
        $.mobile.changePage("#login", {
            transition: "slide",
            reverse: true,
            changeHash: true
        });
        return false;
    }
};
Application.Config = {
    ajUrl: "http://192.168.0.184/MedicineAPI/",
    stayloggedin: false,
    key: "S0xUQk1C"
};
$(document).on("pagebeforeshow", "#searchPatient", function (e, t) {
    console.log("Before");
    if (!Application.isAuthenticate()) {
        $.mobile.changePage("#login");
        return false;
    } else {
        Patients.loadData();
    }
});
$(document).on("pagebeforeshow", "#login", function (e, t) {
    console.log("Login Before");
    if (Application.isAuthenticate()) {
        $.mobile.changePage("#searchPatient");
        return false;
    }
});
$(document).on("pagebeforeshow", "#patientDetail", function () {
    PatientDetail.init();
});
$(document).on("pagebeforeshow", "#requirements", function () {
    Requirement.init();
});
$(document).on("pagebeforeshow", "#addMedicines", function () {
    Medicines.init();
});
$(document).on("pagebeforeshow", "#summary", function () {
    Summary.init();
});
$(document).delegate("#searchPatient", "pageinit", function () {
    Patients.bindEvents();
    Application.bindCommonEvents();
    if (!Application.isAuthenticate()) {
        $.mobile.changePage("#login", {
            transition: "slide",
            reverse: false,
            changeHash: false
        });
        return false;
    }
}).delegate("#login", "pageinit", function () {
    $("#btnLogin").unbind("tap", Application.login).bind("tap", Application.login);
    if (Application.isAuthenticate()) {
        $.mobile.changePage("#searchPatient");
        return false;
    }
}).delegate("#patientDetail", "pageinit", function () {
    PatientDetail.bindEvents();
    Application.bindCommonEvents();
}).delegate("#requirements", "pageinit", function () {
    Requirement.bindEvents();
    Application.bindCommonEvents();
}).delegate("#addMedicines", "pageinit", function () {
    Medicines.bindEvents();
    Application.bindCommonEvents();
}).delegate("#summary", "pageinit", function () {
    Summary.bindEvents();
    Application.bindCommonEvents();
});
