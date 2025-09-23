import { useConfirm } from '@omit/react-confirm-dialog';
import { useLanguage } from '../contexts/LanguageContext';

export const useConfirmDialog = () => {
  const { getLocalizedText } = useLanguage();
  const confirmDialog = useConfirm();

  const confirm = async (options) => {
    const {
      title,
      titleCn,
      message,
      messageCn,
      confirmText = '确认',
      confirmTextCn = '确认',
      cancelText = '取消',
      cancelTextCn = '取消'
    } = options;

    return await confirmDialog({
      title: getLocalizedText(title, titleCn),
      description: getLocalizedText(message, messageCn),
      confirmText: getLocalizedText(confirmText, confirmTextCn),
      cancelText: getLocalizedText(cancelText, cancelTextCn)
    });
  };

  return confirm;
};